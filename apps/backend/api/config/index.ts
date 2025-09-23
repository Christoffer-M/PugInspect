import dotenv from "dotenv";

dotenv.config();

const raiderIoApiKey = process.env.RAIDERIO_API_KEY;
const warcraftLogsBearerToken = process.env.WARCRAFTLOGS_BEARER_TOKEN;

export const config = {
  raiderIoApiKey,
  warcraftLogsBearerToken,
};
