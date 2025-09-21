import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://localhost:4000",
  documents: "src/**/*.{ts,tsx,graphql}",
  ignoreNoDocuments: true,
  generates: {
    "src/generated/": {
      preset: "client",
      plugins: [],
    },
    "src/generated/schema.graphql": {
      plugins: ["schema-ast"],
      config: {
        includeDirectives: true,
      },
    },
  },
};

export default config;
