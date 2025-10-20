import { ApolloServer, BaseContext } from "@apollo/server";
import typeDefs from "./schema/typeDefs.js";
import resolvers from "./schema/resolvers.js";
import { config } from "./config/index.js";
import express from "express";
import http from "node:http";
import cors from "cors";
import { expressMiddleware } from "@as-integrations/express5";

const app = express();

const httpServer = http.createServer(app);

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

// Modified server startup
await new Promise<void>((resolve) =>
  httpServer.listen({ port: config.port }, resolve)
);
console.log(`🚀 Server ready on port ${config.port}`);
export default httpServer;
