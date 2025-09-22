import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "../../packages/graphql-types/src/schema.graphql",
  documents: ["./src/**/*.graphql"],
  generates: {
    "./src/generated/graphql.ts": {
      plugins: [
        "typescript", // base TS types
        "typescript-operations", // typed query/mutation result & variables
        "typescript-react-apollo", // React hooks (useQuery, useMutation, etc.)
      ],
      config: {
        withHooks: true,
        reactApolloVersion: 4,
        documentMode: "string",
        importDocumentNodeExternallyFrom: "@apollo/client",
      },
    },
  },
};
export default config;
