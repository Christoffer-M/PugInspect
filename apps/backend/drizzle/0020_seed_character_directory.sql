-- Seed character_directory with every character a Blizzard profile fetch has
-- confirmed. From here on persistBlizzardProfile keeps it current; rows
-- without a snapshot are skipped, including leftovers from before realm slugs
-- were resolved at the API boundary (#102).
INSERT INTO "character_directory" ("region", "realm", "name", "spec_id", "last_seen_at")
SELECT c."region", c."realm", c."name", (s."raw_data"->'active_spec'->>'id')::integer, s."fetched_at"
FROM "characters" c
JOIN "character_blizzard_snapshots" s ON s."character_id" = c."id"
ON CONFLICT ("region", "realm", "name") DO NOTHING;
