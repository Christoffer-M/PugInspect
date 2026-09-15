-- Deletes character rows persisted under realms Blizzard doesn't publish
-- ("tarrenmill", "chamberof-aspects", "гордунни") before #92 resolved realms
-- at the API boundary. See issue #95.
--
-- Deleting instead of merging into the correct slug: Blizzard 404s these
-- realms, so the rows never got achievements or alt links, and prod has no
-- search_events for them. Everything that cascades is a cached snapshot, and
-- the next lookup re-creates the character under its resolved slug.
--
-- The pairs are the complete set on prod (80 rows) from a dry run on
-- 2026-09-15; #92 stops new ones. rosters.characters is left alone: roster
-- lookups resolve each realm per request.

DELETE FROM characters
WHERE (region, realm) IN (
  ('eu', 'aggraportuguês'),
  ('eu', 'argentdawn'),
  ('eu', 'azjol-nerub'),
  ('eu', 'chamberof-aspects'),
  ('eu', 'chamberofaspects'),
  ('eu', 'chantséternels'),
  ('eu', 'conseildes-ombres'),
  ('eu', 'cultedela-rivenoire'),
  ('eu', 'der-ratvon-dalaran'),
  ('eu', 'dieewige-wacht'),
  ('eu', 'festungder-stürme'),
  ('eu', 'khazmodan'),
  ('eu', 'kultder-verdammten'),
  ('eu', 'la-croisadeécarlate'),
  ('eu', 'laughingskull'),
  ('eu', 'marécagede-zangar'),
  ('eu', 'pozzodelleternità'),
  ('eu', 'shatteredhalls'),
  ('eu', 'tarrenmill'),
  ('eu', 'templenoir'),
  ('eu', 'themaelstrom'),
  ('eu', 'twistingnether'),
  ('eu', 'zirkeldes-cenarius'),
  ('eu', 'гордунни'),
  ('eu', 'ревущийфьорд'),
  ('us', 'area52'),
  ('us', 'moonguard')
);
