import { ApolloServer, BaseContext } from "@apollo/server";
import { characterTypedefs } from "./schema/character/character.typedefs.js";
import characterResolvers from "./schema/character/character.resolvers.js";
import { config } from "./config/index.js";
import { initDb } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import express from "express";
import cors from "cors";
import { isbot } from "isbot";
import { renderCharacterPageHtml } from "./seo/characterMeta.js";
import { renderCharacterCard } from "./seo/characterCard.js";
import { renderSitemapXml } from "./seo/sitemap.js";
import { expressMiddleware } from "@as-integrations/express5";
import { GraphQLError } from "graphql";
import type { SelectionSetNode, ValidationRule } from "graphql";

// Simple query depth limit — no extra dependency needed
function maxQueryDepth(maxDepth: number): ValidationRule {
  function measureDepth(selectionSet: SelectionSetNode | undefined, current = 0): number {
    if (!selectionSet?.selections.length) return current;
    return Math.max(
      ...selectionSet.selections.map((s) => {
        if (s.kind === "Field") return measureDepth(s.selectionSet, current + 1);
        if (s.kind === "InlineFragment") return measureDepth(s.selectionSet, current);
        return current;
      })
    );
  }

  return (validationContext) => ({
    Document: {
      enter(node) {
        for (const definition of node.definitions) {
          if (definition.kind !== "OperationDefinition") continue;
          const depth = measureDepth(definition.selectionSet);
          if (depth > maxDepth) {
            validationContext.reportError(
              new GraphQLError(`Query exceeds maximum depth of ${maxDepth}`, {
                nodes: definition,
              })
            );
          }
        }
      },
    },
  });
}

// Simple field count limit — prevents wide queries that fan out to multiple upstream APIs
function maxFieldCount(maxFields: number): ValidationRule {
  function countFields(selectionSet: SelectionSetNode | undefined): number {
    if (!selectionSet?.selections.length) return 0;
    return selectionSet.selections.reduce((sum, s) => {
      if (s.kind === "Field") return sum + 1 + countFields(s.selectionSet);
      if (s.kind === "InlineFragment") return sum + countFields(s.selectionSet);
      return sum;
    }, 0);
  }

  return (validationContext) => ({
    Document: {
      enter(node) {
        for (const definition of node.definitions) {
          if (definition.kind !== "OperationDefinition") continue;
          const count = countFields(definition.selectionSet);
          if (count > maxFields) {
            validationContext.reportError(
              new GraphQLError(`Query exceeds maximum field count of ${maxFields}`, {
                nodes: definition,
              })
            );
          }
        }
      },
    },
  });
}

// Simple per-IP rate limiter: max requests per sliding window
function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();

  // Sweep expired entries periodically to prevent unbounded memory growth
  // from IPs that make requests and then stop (never naturally evicted).
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store) {
      if (now > entry.resetAt) store.delete(ip);
    }
  }, windowMs).unref();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req) ?? "unknown";
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      res.status(429).json({ errors: [{ message: "Too many requests" }] });
      return;
    }
    next();
  };
}

await runMigrations(config.databaseUrl);
initDb(config.databaseUrl);
console.log("[db] Database ready");

const app = express();
// Production requests arrive through Cloudflare plus two local proxies
// (nginx-proxy → frontend nginx). Trusting every private-range hop makes
// req.ip resolve to the nearest public address — the Cloudflare edge in
// production — no matter how many local hops the deployment has.
app.set("trust proxy", "loopback, linklocal, uniquelocal");

// The real visitor address: Cloudflare stamps it on CF-Connecting-IP, which
// passes through the local proxies untouched. req.ip (the Cloudflare edge in
// production, the direct peer elsewhere) is only the fallback.
function getClientIp(req: express.Request): string | undefined {
  const cf = req.headers["cf-connecting-ip"];
  return typeof cf === "string" && cf !== "" ? cf : req.ip;
}

// Crawlers execute the SPA and fire real GraphQL queries; resolvers use this
// flag to serve them from the DB cache without spending upstream API quota.
type GraphQLContext = BaseContext & { isBot: boolean };

const server = new ApolloServer<GraphQLContext>({
  typeDefs: characterTypedefs,
  resolvers: characterResolvers,
  validationRules: [maxQueryDepth(8), maxFieldCount(120)],
  introspection: process.env.NODE_ENV !== "production",
});

await server.start();

const corsOptions: cors.CorsOptions = {
  origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : false,
};

const graphqlRateLimiter = createRateLimiter(100, 60_000);

app.get("/", (_, res) => {
  res.redirect("/graphql");
});

app.use(
  "/graphql",
  graphqlRateLimiter,
  cors<cors.CorsRequest>(corsOptions),
  express.json(),
  expressMiddleware(server, {
    // A missing user-agent means a scripted client — treat it as a bot too.
    context: async ({ req }) => {
      const userAgent = req.headers["user-agent"];
      return { isBot: !userAgent || isbot(userAgent) };
    },
  })
);

// Analytics script proxy — cached for 1 hour to avoid depending on Umami on every request
let statsJsCache: { body: string; expiresAt: number } | null = null;

app.get("/stats.js", async (_, res) => {
  res.setHeader("Content-Type", "application/javascript");
  try {
    if (statsJsCache && Date.now() < statsJsCache.expiresAt) {
      return res.send(statsJsCache.body);
    }
    const upstream = await fetch("https://stats.puginspect.com/script.js");
    if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);
    const body = await upstream.text();
    statsJsCache = { body, expiresAt: Date.now() + 60 * 60 * 1000 };
    res.send(body);
  } catch {
    res.status(502).send("// analytics unavailable");
  }
});

// Analytics event proxy — first-party path so ad blockers that block the
// stats.* subdomain don't drop events from real visitors. The client's UA and
// IP are forwarded so Umami still attributes device, browser, and geo.
const sendRateLimiter = createRateLimiter(120, 60_000);

app.post(
  "/api/send",
  sendRateLimiter,
  express.json({ type: "*/*", limit: "32kb" }),
  async (req, res) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const userAgent = req.headers["user-agent"];
      if (userAgent) headers["User-Agent"] = userAgent;
      // Umami hands the client a cache token in the response body and expects
      // it back on subsequent events; pass it through both ways.
      const cache = req.headers["x-umami-cache"];
      if (typeof cache === "string") headers["X-Umami-Cache"] = cache;

      // Umami geolocates from the connecting IP — this server's after
      // proxying — but prefers payload.ip when present, so inject the real
      // visitor IP there. Strip node's IPv4-mapped prefix, which Umami's
      // payload validation rejects.
      const body = req.body as { payload?: Record<string, unknown> } | undefined;
      const visitorIp = getClientIp(req)?.replace(/^::ffff:/, "");
      if (body?.payload && typeof body.payload === "object" && visitorIp) {
        body.payload.ip = visitorIp;
      }

      const upstream = await fetch("https://stats.puginspect.com/api/send", {
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {}),
      });
      res.status(upstream.status).send(await upstream.text());
    } catch {
      res.status(502).send("analytics unavailable");
    }
  }
);

// Sitemap with character pages from the DB — nginx proxies /sitemap.xml here.
// The renderer caches for an hour, so the rate limit only guards cache misses.
const sitemapRateLimiter = createRateLimiter(30, 60_000);

app.get("/sitemap.xml", sitemapRateLimiter, async (_, res) => {
  const xml = await renderSitemapXml();
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.type("application/xml").send(xml);
});

// Character page meta injection for crawlers/link unfurlers — nginx routes
// bot requests for /{region}/{realm}/{name} here (rewritten to /meta/...).
const metaRateLimiter = createRateLimiter(60, 60_000);

app.get("/meta/:region/:realm/:name", metaRateLimiter, async (req, res) => {
  const { region, realm, name } = req.params;
  const html =
    typeof region === "string" && typeof realm === "string" && typeof name === "string"
      ? await renderCharacterPageHtml(region, realm, name)
      : null;
  if (!html) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  res.type("html").send(html);
});

// Per-character og:image card for Discord/Twitter/etc. Nginx proxies /card/
// straight here; the meta endpoint above points og:image at this URL.
const cardRateLimiter = createRateLimiter(120, 60_000);

app.get("/card/:region/:realm/:name", cardRateLimiter, async (req, res) => {
  const { region, realm, name } = req.params;
  if (typeof region !== "string" || typeof realm !== "string" || typeof name !== "string") {
    res.status(400).end();
    return;
  }
  const png = await renderCharacterCard(region, realm, name);
  if (!png) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=900");
  res.end(png);
});

app.listen({ port: config.port });

console.log(`🚀 Server ready on port ${config.port}`);
