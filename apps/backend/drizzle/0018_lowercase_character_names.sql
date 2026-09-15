-- Lowercases character names. Query.character used to pass the name through
-- as the client sent it, and the Blizzard/WCL/equipment persist paths wrote
-- it unchanged while RIO lowercased it, so one lookup for "Стоуфилд" could
-- create two rows. The resolver now normalizes at the boundary (#104).
--
-- On prod this touched 3 rows, all from 2026-08-15: two with a lowercase twin,
-- one without. Matching on the general rule rather than those ids also covers
-- anything written before this deploy.
--
-- 1. Rows with no lowercase twin are renamed in place, keeping their data.
--    If several spellings share one lowercase name, the most recently updated
--    is renamed and the rest fall through to steps 2-3 against it.
-- 2. Rows that now have a twin move their search_events onto it, so /stats
--    totals don't change.
-- 3. Those rows are deleted. What cascades (snapshots, achievements, alt
--    links) is refetched and rebuilt on the twin's next lookup.
--
-- Relies on lower() lowercasing non-ASCII names, which the prod database
-- (en_US.utf8) does.

UPDATE characters
SET    name = lower(name)
WHERE  id IN (
  SELECT DISTINCT ON (c.region, c.realm, lower(c.name)) c.id
  FROM   characters c
  WHERE  c.name <> lower(c.name)
    AND  NOT EXISTS (
           SELECT 1 FROM characters t
           WHERE  t.region = c.region AND t.realm = c.realm AND t.name = lower(c.name))
  ORDER  BY c.region, c.realm, lower(c.name), c.updated_at DESC
);
--> statement-breakpoint
UPDATE search_events e
SET    character_id = t.id
FROM   characters c
JOIN   characters t
  ON   t.region = c.region AND t.realm = c.realm AND t.name = lower(c.name)
WHERE  e.character_id = c.id
  AND  c.name <> lower(c.name);
--> statement-breakpoint
DELETE FROM characters WHERE name <> lower(name);
