import dotenv from 'dotenv';

dotenv.config();

export const config = {
  raiderIoApiKey: process.env.RAIDERIO_API_KEY || '',
};
