import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as DotEnvConfig } from "./src/config/index";

const config: CodegenConfig = {
  overwrite: true,
  config: {
    strict: true,
    enumsAsTypes: true,
  },
  ignoreNoDocuments: true,
  generates: {
    "./src/schema/services/warcraftLogs/generated/index.ts": {
      documents: "./src/schema/services/warcraftLogs/queries/*.ts",
      schema: {
        "https://www.warcraftlogs.com/api/v2/client": {
          headers: {
            Authorization: `Bearer ${DotEnvConfig.warcraftLogsBearerToken}`,
          },
        },
      },
      plugins: ["typescript", "typescript-operations"],
    },
    "./src/schema/services/warcraftLogs/generated/schema.graphql": {
      plugins: ["schema-ast"],
      schema: {
        "https://www.warcraftlogs.com/api/v2/client": {
          headers: {
            Authorization: `Bearer ${DotEnvConfig.warcraftLogsBearerToken}`,
          },
        },
      },
    },
    "../../packages/graphql-types/src/index.ts": {
      schema: "./src/schema/character/character.typedefs.ts",
      plugins: ["typescript", "typescript-operations"],
    },
    "../../packages/graphql-types/src/schema.graphql": {
      schema: "./src/schema/character/character.typedefs.ts",
      plugins: ["schema-ast"],
      config: { includeDirectives: true },
    },
  },
};

export default config;
