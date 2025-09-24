import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema/typeDefs.js";
import resolvers from "./schema/resolvers.js";
import { config } from "./config/index.js";

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: config.port },
  context: async () => ({
    // You can pass auth, loaders, cache here
  }),
});

console.log(`🚀 Server ready at ${url}`);
