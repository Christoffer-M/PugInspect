-- Merges duplicate character rows caused by inconsistent realm normalisation:
-- RaiderIO stripped dashes ("tarren-mill" → "tarrenmill") while WarcraftLogs
-- kept them ("tarren-mill" → "tarren-mill"), producing two rows per character
-- on multi-word realms.
--
-- Strategy
-- ────────
-- 1. Build a dedup key by stripping dashes, spaces and apostrophes from realm
--    and grouping by (region, name, key).  Any group with >1 row is a duplicate.
-- 2. Within each group, keep the row whose realm already looks like the new
--    canonical slug (contains a dash).  On a tie fall back to smallest UUID.
-- 3. Re-point child snapshot rows from the dropped character to the kept one,
--    preferring the more-recently-fetched snapshot when both sides have one.
-- 4. Normalise every remaining realm: spaces → dashes, apostrophes removed.

DO $$
DECLARE
  rec RECORD;
BEGIN

  -- ────────────────────────────────────────────────────────────────────────────
  -- STEP 1  Merge duplicates
  -- ────────────────────────────────────────────────────────────────────────────
  FOR rec IN
    WITH stripped AS (
      SELECT
        id,
        region,
        name,
        realm,
        -- dedup key: lowercase realm with dashes, spaces, and apostrophes removed
        lower(translate(realm, E' -\'\u2018\u2019`', '')) AS key
      FROM characters
    ),
    groups AS (
      SELECT
        region,
        name,
        key,
        -- ids[1] = keep (prefers realm that contains a dash; then smallest UUID)
        array_agg(id ORDER BY
          CASE WHEN realm LIKE '%-%' THEN 0 ELSE 1 END,
          id
        ) AS ids
      FROM stripped
      GROUP BY region, name, key
      HAVING count(*) > 1
    )
    SELECT
      ids[1]           AS keep_id,
      unnest(ids[2:])  AS drop_id
    FROM groups
  LOOP

    -- RIO snapshots: one per character (unique index on character_id).
    -- If drop's snapshot is newer than keep's, delete keep's so we can
    -- re-point the fresher one.  Otherwise just delete drop's below.
    DELETE FROM character_rio_snapshots
    WHERE character_id = rec.keep_id
      AND EXISTS (
        SELECT 1
        FROM   character_rio_snapshots d
        WHERE  d.character_id = rec.drop_id
          AND  d.fetched_at   > (
                 SELECT fetched_at
                 FROM   character_rio_snapshots
                 WHERE  character_id = rec.keep_id
               )
      );

    -- Re-point drop's snapshot only if keep no longer has one
    UPDATE character_rio_snapshots
    SET    character_id = rec.keep_id
    WHERE  character_id = rec.drop_id
      AND  NOT EXISTS (
             SELECT 1 FROM character_rio_snapshots
             WHERE character_id = rec.keep_id
           );

    -- Clean up any remaining snapshot on the drop side
    DELETE FROM character_rio_snapshots WHERE character_id = rec.drop_id;

    -- WCL snapshots: unique per (character_id, zone_id, difficulty, metric,
    -- role, by_bracket).  Handle each overlapping slot individually.
    DELETE FROM character_wcl_snapshots k
    WHERE k.character_id = rec.keep_id
      AND EXISTS (
        SELECT 1
        FROM   character_wcl_snapshots d
        WHERE  d.character_id = rec.drop_id
          AND  d.zone_id      = k.zone_id
          AND  d.difficulty   = k.difficulty
          AND  d.metric       = k.metric
          AND  d.role         = k.role
          AND  d.by_bracket   = k.by_bracket
          AND  d.fetched_at   > k.fetched_at
      );

    -- Move drop's snapshots to keep (skip any slot already occupied by keep)
    UPDATE character_wcl_snapshots
    SET    character_id = rec.keep_id
    WHERE  character_id = rec.drop_id
      AND  NOT EXISTS (
             SELECT 1
             FROM   character_wcl_snapshots k
             WHERE  k.character_id = rec.keep_id
               AND  k.zone_id      = character_wcl_snapshots.zone_id
               AND  k.difficulty   = character_wcl_snapshots.difficulty
               AND  k.metric       = character_wcl_snapshots.metric
               AND  k.role         = character_wcl_snapshots.role
               AND  k.by_bracket   = character_wcl_snapshots.by_bracket
           );

    -- Drop any remaining snapshots on the duplicate side (conflicts where
    -- keep's snapshot was newer, so they were not re-pointed above)
    DELETE FROM character_wcl_snapshots WHERE character_id = rec.drop_id;

    DELETE FROM characters WHERE id = rec.drop_id;

  END LOOP;

  -- ────────────────────────────────────────────────────────────────────────────
  -- STEP 2  Normalise remaining realm values
  --
  -- Converts any realm that still has spaces or apostrophes into the new
  -- canonical slug form.  Rows already in canonical form are untouched.
  -- ────────────────────────────────────────────────────────────────────────────
  UPDATE characters
  SET    realm = trim(lower(
                  regexp_replace(
                    translate(realm, E'\'\u2018\u2019`', ''),
                    '\s+', '-', 'g'
                  )
                ))
  WHERE  realm IS DISTINCT FROM
         trim(lower(
           regexp_replace(
             translate(realm, E'\'\u2018\u2019`', ''),
             '\s+', '-', 'g'
           )
         ));

END $$;
