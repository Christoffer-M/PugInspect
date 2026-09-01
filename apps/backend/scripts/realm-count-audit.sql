-- Realm-count audit for the /stats "Realms tracked" card.
--
-- Run against the production database:
--   psql "$DATABASE_URL" -f apps/backend/scripts/realm-count-audit.sql
-- or, on the VPS:
--   docker compose exec -T postgres psql -U puginspect -d puginspect \
--     < apps/backend/scripts/realm-count-audit.sql
--
-- Read-only: every statement is a SELECT.
--
-- Why: `realmsTracked` is count(distinct (region, realm)) over `characters`
-- (apps/backend/src/db/stats.ts). That is only the number of real realms if
-- every row spells a realm exactly one way. Two write-path gaps can break that:
--
--   1. region is stored verbatim from the request. The resolvers validate with
--      region.toLowerCase() but pass args.region through unchanged, so a URL
--      like /EU/kazzak/foo stores region 'EU' — a second (region, realm) pair
--      for a realm already counted under 'eu'.
--   2. realm is stored as normalizeRealm(input), which lowercases and turns
--      spaces into dashes but cannot insert a missing dash. 'tarrenmill' and
--      'tarren-mill' are both accepted upstream and both stored, and count as
--      two realms. This is the same class of duplicate the
--      0001_deduplicate_realms migration cleaned up once.
--
-- Query 2 vs. query 1 is the answer: if they match, the number on the page is
-- real. Queries 3–6 show what is inflating it if they don't.

\echo '=== 1. What the stats page shows right now ==='
SELECT
  count(*)                             AS total_characters,
  count(DISTINCT (region, realm))      AS realms_tracked_as_shipped,
  count(DISTINCT region)               AS region_values_as_stored
FROM characters;

\echo ''
\echo '=== 2. The same count with case and dash variants collapsed ==='
-- realm_key strips dashes, spaces and apostrophes — the dedup key from
-- 0001_deduplicate_realms — so 'tarren-mill' and 'tarrenmill' collapse to one.
WITH normalized AS (
  SELECT
    lower(region)                                          AS region,
    lower(translate(realm, E' -\'‘’`', ''))       AS realm_key
  FROM characters
)
SELECT count(DISTINCT (region, realm_key)) AS realms_tracked_deduped
FROM normalized;

\echo ''
\echo '=== 3. Region values exactly as stored (should be only eu/us/kr/tw) ==='
SELECT
  region,
  count(*)               AS characters,
  count(DISTINCT realm)  AS realms
FROM characters
GROUP BY region
ORDER BY characters DESC;

\echo ''
\echo '=== 4. Realms per region vs. how many realms that region actually has ==='
-- Ceiling is approximate (live retail realms, incl. connected-realm members).
-- Exceeding it is proof of inflation; sitting under it proves nothing.
WITH ceilings (region, approx_live_realms) AS (
  VALUES ('eu', 270), ('us', 250), ('kr', 12), ('tw', 11)
), tracked AS (
  SELECT lower(region) AS region, count(DISTINCT realm) AS realms
  FROM characters
  GROUP BY lower(region)
)
SELECT
  c.region,
  COALESCE(t.realms, 0)  AS realms_tracked,
  c.approx_live_realms,
  COALESCE(t.realms, 0) > c.approx_live_realms AS impossible
FROM ceilings c
LEFT JOIN tracked t USING (region)
ORDER BY c.approx_live_realms DESC;

\echo ''
\echo '=== 5. Realms stored under more than one spelling or region casing ==='
SELECT
  lower(region)                                      AS region,
  lower(translate(realm, E' -\'‘’`', ''))  AS realm_key,
  count(DISTINCT realm)                              AS realm_spellings,
  count(DISTINCT region)                             AS region_spellings,
  array_agg(DISTINCT region || '/' || realm)         AS stored_as,
  count(*)                                           AS character_rows
FROM characters
GROUP BY 1, 2
HAVING count(DISTINCT realm) > 1 OR count(DISTINCT region) > 1
ORDER BY realm_spellings DESC, character_rows DESC
LIMIT 50;

\echo ''
\echo '=== 6. Duplicate character rows (same character, different casing) ==='
-- Not a realm problem, but the same missing normalisation: it inflates
-- totalCharacters and splits one character across several rows.
SELECT
  lower(region)          AS region,
  realm,
  lower(name)            AS name,
  count(*)               AS rows,
  array_agg(region || '/' || realm || '/' || name) AS stored_as
FROM characters
GROUP BY 1, 2, 3
HAVING count(*) > 1
ORDER BY rows DESC
LIMIT 50;
