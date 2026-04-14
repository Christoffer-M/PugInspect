import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

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
};
