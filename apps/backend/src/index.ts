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
app.use(
  "/graphql",
  cors<cors.CorsRequest>(),
  express.json(),
  expressMiddleware(server)
);

// For Analytics
app.get("/stats.js", async (req, res) => {
  const scriptText = await fetch("https://cloud.umami.is/script.js");
  res.send(await scriptText.text());
});

app.listen({ port: config.port });

console.log(`🚀 Server ready on port ${config.port}`);

export default httpServerHandler({ port: config.port });
