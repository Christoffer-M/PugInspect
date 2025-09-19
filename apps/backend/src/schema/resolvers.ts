import characterResolvers from "./character/character.resolvers.js";

export default {
  Query: {
    ...characterResolvers.Query,
  },
};
