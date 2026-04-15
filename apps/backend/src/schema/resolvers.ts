import characterResolvers from "./character/character.resolvers.js";

export default {
  Query: {
    ...characterResolvers.Query,
  },
  Character: characterResolvers.Character,
};
