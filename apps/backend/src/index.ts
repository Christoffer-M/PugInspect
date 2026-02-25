import { ApolloServer, BaseContext } from "@apollo/server";
import typeDefs from "./schema/typeDefs.js";
import resolvers from "./schema/resolvers.js";
import { config } from "./config/index.js";
import express from "express";
import cors from "cors";
import { expressMiddleware } from "@as-integrations/express5";
import { httpServerHandler } from "cloudflare:node";

const app = express();

const server = new ApolloServer<BaseContext>({
  typeDefs,
  resolvers,
});

await server.start();

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 100;
const ipHitMap = new Map<string, { count: number; resetAt: number }>();

app.get("/", (_, res) => {
  res.redirect("/graphql");
});

app.use(
  "/graphql",
  cors<cors.CorsRequest>(),
  express.json(),
  expressMiddleware(server)
);

// For Analytics
app.get("/stats.js", async (_, res) => {
  const scriptText = await fetch("https://cloud.umami.is/script.js");
  res.send(await scriptText.text());
});

app.listen({ port: config.port });

console.log(`🚀 Server ready on port ${config.port}`);

const nodeHandler = httpServerHandler({ port: config.port });

export default {
  ...nodeHandler,
  async fetch(...args: Parameters<NonNullable<typeof nodeHandler.fetch>>): Promise<Response> {
    const [request] = args;
    const url = new URL(request.url);

    if (url.pathname.startsWith("/graphql")) {
      // CF-Connecting-IP is set by Cloudflare and cannot be spoofed,
      // unlike X-Forwarded-For that Express's req.ip relies on.
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const now = Date.now();
      const entry = ipHitMap.get(ip);

      if (entry && now < entry.resetAt && entry.count >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({ errors: [{ message: "Too many requests, please try again later." }] }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!entry || now >= entry.resetAt) {
        ipHitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      } else {
        entry.count++;
      }
    }

    return nodeHandler.fetch!(...args);
  },
};
