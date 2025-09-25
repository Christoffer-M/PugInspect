export default {
  projects: {
    web: {
      schema: ["packages/graphql-types/src/schema.graphql"],
      documents: ["apps/frontend/src/**/*.{ts,tsx,js,jsx}"],
    },
    api: {
      schema:
        "apps/backend/src/schema/services/warcraftLogs/generated/schema.graphql",
      documents: ["apps/backend/src/**/*.{ts,tsx,js,jsx}"],
    },
  },
};
