import { ApolloServer, BaseContext } from "@apollo/server";
import typeDefs from "./schema/typeDefs.js";
import resolvers from "./schema/resolvers.js";
import { config } from "./config/index.js";
import express from "express";
import cors from "cors";
import { expressMiddleware } from "@as-integrations/express5";
import { httpServerHandler } from "cloudflare:node";
import { initKV } from "./kv.js";

const app = express();

const server = new ApolloServer<BaseContext>({
  typeDefs,
  resolvers,
});

await server.start();

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
    const [, env] = args as [Request, { TOKEN_CACHE?: KVNamespace; RESPONSE_CACHE?: KVNamespace }, ExecutionContext];
    initKV(env.TOKEN_CACHE, env.RESPONSE_CACHE);
    if (!env.TOKEN_CACHE || !env.RESPONSE_CACHE) {
      console.error("CRITICAL: KV bindings missing — all caching disabled");
    }
    return nodeHandler.fetch!(...args);
  },
};
