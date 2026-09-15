export const config = {
  graphqlUrl: import.meta.env.VITE_GRAPHQL_URL ?? "/graphql",
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  // Public by design (it ships in the page as data-website-id), so it lives in
  // code rather than a build arg. Analytics only load in production builds.
  umamiWebsiteId: "92e308a6-8828-48ba-96ed-ee297c0fb3f2",
};