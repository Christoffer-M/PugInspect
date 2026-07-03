// config/index.ts throws on import when required env vars are missing.
// Stub them so modules that transitively import config can load in tests.
// Real values are never needed — tests must not hit external APIs or the DB.
process.env.RAIDERIO_API_KEY ??= "test";
process.env.WARCRAFTLOGS_CLIENT_ID ??= "test";
process.env.WARCRAFTLOGS_CLIENT_SECRET ??= "test";
process.env.BLIZZARD_CLIENT_ID ??= "test";
process.env.BLIZZARD_CLIENT_SECRET ??= "test";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
