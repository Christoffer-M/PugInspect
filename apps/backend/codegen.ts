import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as DotEnvConfig } from "./src/config/index";

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    "http://localhost:4000/",
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
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-resolvers", "typescript-operations"],
    },
    "src/generated/schema.graphql": {
      plugins: ["schema-ast"],
    },
  },
};

export default config;
