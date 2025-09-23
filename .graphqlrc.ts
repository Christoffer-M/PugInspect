export default {
  projects: {
    web: {
      schema: ["./packages/graphql-types/src/schema.graphql"],
      documents: ["./apps/frontend/src/**/*.{ts,tsx,js,jsx}"],
    },
    api: {
      schema:
        "apps/backend/api/schema/services/warcraftLogs/generated/schema.graphql",
      documents: ["apps/backend/api/**/*.{ts,tsx,js,jsx}"],
    },
  },
};
