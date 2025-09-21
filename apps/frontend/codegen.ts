import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://localhost:4000",
  documents: "src/**/*.{ts,tsx,graphql}",
  ignoreNoDocuments: true,
  config: {
    strict: true,
    enumsAsTypes: true,
  },
  generates: {
    "src/generated/": {
      preset: "client",
      plugins: [],
    },
    "src/generated/graphql.schema.json": {
      plugins: ["introspection"],
    },
  },
};

export default config;
