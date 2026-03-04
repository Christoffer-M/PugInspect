import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const raiderIoApiKey = process.env.RAIDERIO_API_KEY;
const warcraftLogsClientId = process.env.WARCRAFTLOGS_CLIENT_ID;
const warcraftLogsClientSecret = process.env.WARCRAFTLOGS_CLIENT_SECRET;
const port = Number.parseInt(process.env.PORT ?? "4000");

console.log("RAIDERIO_API_KEY:", process.env.RAIDERIO_API_KEY);

export const config = {
  raiderIoApiKey,
  warcraftLogsClientId,
  warcraftLogsClientSecret,
  port,
};
