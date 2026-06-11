import { ApolloServer, BaseContext } from "@apollo/server";
import typeDefs from "./schema/typeDefs.js";
import resolvers from "./schema/resolvers.js";
import { config } from "./config/index.js";
import { initDb } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import express from "express";
import cors from "cors";
import { renderCharacterPageHtml } from "./seo/characterMeta.js";
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
    const ip = req.ip ?? "unknown";
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
app.set("trust proxy", 1);

const server = new ApolloServer<BaseContext>({
  typeDefs,
  resolvers,
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
  expressMiddleware(server)
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

app.listen({ port: config.port });

console.log(`🚀 Server ready on port ${config.port}`);
