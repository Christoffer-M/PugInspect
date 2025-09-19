import { gql } from 'graphql-tag';
import chracterTypedefs from './character/chracter.typedefs.js';

const baseTypeDefs = gql`
  type Query {
    _empty: String
  }
`;

export default [baseTypeDefs, chracterTypedefs];
