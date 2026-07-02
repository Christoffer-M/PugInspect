import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// .env is optional — in Docker, env vars come from the environment itself
try {
  process.loadEnvFile(resolve(__dirname, "../../.env"));
} catch {}

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  raiderIoApiKey: required("RAIDERIO_API_KEY"),
  warcraftLogsClientId: required("WARCRAFTLOGS_CLIENT_ID"),
  warcraftLogsClientSecret: required("WARCRAFTLOGS_CLIENT_SECRET"),
  blizzardClientId: required("BLIZZARD_CLIENT_ID"),
  blizzardClientSecret: required("BLIZZARD_CLIENT_SECRET"),
  port: Number.parseInt(process.env.PORT ?? "4000"),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean),
  databaseUrl: required("DATABASE_URL"),
  // Origin the frontend container is reachable at from inside the Docker network —
  // used to fetch the built index.html for bot meta injection.
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://frontend",
  // Public-facing origin used for canonical/og:url links in injected meta tags.
  publicOrigin: process.env.PUBLIC_ORIGIN ?? "https://puginspect.com",
};
