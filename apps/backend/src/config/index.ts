import dotenv from "dotenv";

dotenv.config();

const raiderIoApiKey = process.env.RAIDERIO_API_KEY;
const warcraftLogsClientId = process.env.WARCRAFTLOGS_CLIENT_ID;
const warcraftLogsClientSecret = process.env.WARCRAFTLOGS_CLIENT_SECRET;
const port = Number.parseInt(process.env.PORT ?? "4000");

export const config = {
  raiderIoApiKey,
  warcraftLogsClientId,
  warcraftLogsClientSecret,
  port,
};
