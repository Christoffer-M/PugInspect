import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as DotEnvConfig } from "./src/config/index";

async function getAccessToken(): Promise<string> {
  const { warcraftLogsClientId, warcraftLogsClientSecret } = DotEnvConfig;

  if (!warcraftLogsClientId || !warcraftLogsClientSecret) {
    throw new Error(
      "WARCRAFTLOGS_CLIENT_ID and WARCRAFTLOGS_CLIENT_SECRET must be set in .env to run codegen."
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: warcraftLogsClientId,
    client_secret: warcraftLogsClientSecret,
  });

  const res = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch WarcraftLogs token: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

const config: Promise<CodegenConfig> = getAccessToken().then((token) => ({
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
            Authorization: `Bearer ${token}`,
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
            Authorization: `Bearer ${token}`,
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
}));

export default config;
