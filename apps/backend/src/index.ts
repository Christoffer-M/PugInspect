import { ApolloServer, BaseContext } from "@apollo/server";
import typeDefs from "./schema/typeDefs.js";
import resolvers from "./schema/resolvers.js";
import { config } from "./config/index.js";
import express from "express";
import cors from "cors";
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

// Simple per-IP rate limiter: max requests per sliding window
function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();
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

const app = express();

const server = new ApolloServer<BaseContext>({
  typeDefs,
  resolvers,
  validationRules: [maxQueryDepth(8)],
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
    const upstream = await fetch("https://cloud.umami.is/script.js");
    if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);
    const body = await upstream.text();
    statsJsCache = { body, expiresAt: Date.now() + 60 * 60 * 1000 };
    res.send(body);
  } catch {
    res.status(502).send("// analytics unavailable");
  }
});

app.listen({ port: config.port });

console.log(`🚀 Server ready on port ${config.port}`);
