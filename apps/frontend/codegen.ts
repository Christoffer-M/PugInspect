import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "../../packages/graphql-types/src/schema.graphql",
  documents: ["src/**/*.tsx"],
  ignoreNoDocuments: true,
  generates: {
    "./src/graphql/": {
      preset: "client",
      config: {
        documentMode: "string",
      },
    },
    "./src/graphql/schema.graphql": {
      plugins: ["schema-ast"],
      config: {
        includeDirectives: true,
      },
    },
  },
};
export default config;
