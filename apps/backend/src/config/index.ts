import dotenv from "dotenv";

dotenv.config();

const raiderIoApiKey = process.env.RAIDERIO_API_KEY;
const warcraftLogsBearerToken = process.env.WARCRAFTLOGS_BEARER_TOKEN;
const port = Number.parseInt(process.env.PORT ?? "4000");

export const config = {
  raiderIoApiKey,
  warcraftLogsBearerToken,
  port,
};
