# Seasonal / Expansion Update Checklist

Game knowledge that no API exposes is hardcoded behind a greppable tag. To find
**every** spot that may need updating when a new season, raid tier, or expansion
launches:

```sh
grep -rn "SEASON-CONFIG" apps/
```

That grep is the source of truth — this document just explains the workflow.
If you add a new season-dependent constant anywhere, tag its comment with
`SEASON-CONFIG:` so the grep keeps finding everything.

## New M+ season

- `apps/frontend/src/data/mythicPlusSeasons.ts` — add the season slug + WCL zone
  ID, bump `DEFAULT_MYTHIC_PLUS_SEASON`
- `apps/frontend/src/data/dungeons/` — add `dungeons_<season>.ts` with the new
  dungeon pool and point the `CURRENT_DUNGEONS` re-export at it

## New raid tier

- `apps/frontend/src/data/raidZones.ts` — add the Raider.IO slug + WCL zone ID,
  bump `DEFAULT_RAID`
- `apps/backend/src/seo/characterCard.ts` — keep `DEFAULT_RAID` in sync (drives
  the Discord og:image card)

## New expansion (additionally)

- `apps/backend/src/schema/mappers/gear.mapper.ts` — `ENCHANTABLE_SLOTS`:
  which slots take a permanent enchant this era (Midnight removed cloak/bracer,
  added helm/shoulder — this changes per expansion). Verify empirically: query
  a well-geared character's gear via GraphQL and check which slots top players
  enchant; the enchant display strings name the slot ("Enchant Helm - …").
  Update the mapper tests alongside.
- `apps/frontend/src/components/gear/GearSection.tsx` — `MAX_LEVEL` (gates
  gear-check warnings for leveling characters)

## Verifying

Flags are derived at query time from cached raw payloads, so config changes
take effect immediately — no cache flush needed. Sanity-check with a known
fully-enchanted character (should show "Fully enchanted & gemmed") and run
`pnpm test` in `apps/backend`.
