import { defineConfig } from "drizzle-kit";

// .env is optional — same native idiom as src/config/index.ts (no dotenv dependency)
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://puginspect:localdev@localhost:5432/puginspect",
  },
});
