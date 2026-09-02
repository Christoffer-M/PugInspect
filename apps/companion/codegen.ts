import type { CodegenConfig } from "@graphql-codegen/cli";

// Same setup as apps/frontend: types come from the backend's exported schema,
// so a removed or renamed field fails `check-types` instead of a user's screen.
const config: CodegenConfig = {
  overwrite: true,
  schema: "../../packages/graphql-types/src/schema.graphql",
  documents: ["src/api.ts"],
  generates: {
    "./src/graphql/": {
      preset: "client",
      config: { documentMode: "string" },
    },
  },
};
export default config;
