import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as DotEnvConfig } from "./src/config/index";

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      "https://www.warcraftlogs.com/api/v2/client": {
        headers: {
          Authorization: `Bearer ${DotEnvConfig.warcraftLogsBearerToken}`,
        },
      },
    },
  ],
  config: {
    strict: true,
    enumsAsTypes: true,
  },
  documents: ["./src/**/*.ts", "./src/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "./src/generated/": {
      preset: "client",
      config: {
        documentMode: "string",
      },
    },
    "./src/generated/schema.graphql": {
      plugins: ["schema-ast"],
      config: {
        includeDirectives: true,
      },
    },
  },
};

export default config;
