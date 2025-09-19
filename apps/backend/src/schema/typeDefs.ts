import { gql } from "graphql-tag";
import chracterTypedefs from "./character/character.typedefs.js";

const baseTypeDefs = gql`
  type Query {
    _empty: String
  }
`;

export default [baseTypeDefs, chracterTypedefs];
