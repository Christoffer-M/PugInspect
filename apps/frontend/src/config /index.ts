import dotenv from "dotenv";

dotenv.config();

const apiUrl = process.env.API_URL ?? "http://localhost:4000/graphql";

export const config = {
  apiUrl: apiUrl,
};
