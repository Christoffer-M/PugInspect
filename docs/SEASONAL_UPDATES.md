# Seasonal / Expansion Update Checklist

## New season or raid tier

```sh
pnpm season:update
```

That's it — the script (`scripts/update-season-config.mts`) regenerates

- `apps/frontend/src/generated/seasonConfig.ts` — M+ seasons + default,
  dungeon pool, raids + `DEFAULT_RAID`, tier-set id ranges
- `apps/backend/src/generated/seasonConfig.ts` — `DEFAULT_RAID` (drives
  the Discord og:image card)

from Raider.IO static-data (seasons, dungeons, raids), WarcraftLogs zones
(zone IDs, matched by name) and the Blizzard item-set index (new contiguous
blocks of 13 class sets become the next tier number). It needs
`apps/backend/.env` for the WCL and Blizzard credentials.

Then **review the diff** — the script warns when it can't match a WCL zone or
when an item-set block doesn't look like a tier — and run `pnpm test` in
`apps/backend`.

Notes:

- `DEFAULT_RAID` = newest current-expansion raid with ≥3 encounters
  (single-boss event raids like Sporefall don't count as a tier).
- Multi-raid tiers get terse API names; add a pretty one to
  `RAID_DISPLAY_OVERRIDES` in the script if needed.

## New expansion (additionally, hand-maintained)

All hand-maintained seasonal inputs live in one file:
`scripts/season-config.mts` (the script logic itself stays in
`scripts/update-season-config.mts`). At an expansion boundary update there,
then re-run `pnpm season:update`:

- `EXPANSIONS` — shift the current expansion to "previous" and add the new
  one (Raider.IO expansion id + name).
- `MAX_LEVEL` — the new level cap (gates gear-check warnings for leveling
  characters).
- `ENCHANTABLE_SLOTS` — which slots take a permanent enchant this era
  (Midnight removed cloak/bracer, added helm/shoulder — this changes per
  expansion). Verify empirically: query a well-geared character's gear via
  GraphQL and check which slots top players enchant; the enchant display
  strings name the slot ("Enchant Helm - …"). Update the gear.mapper tests
  alongside.

## Verifying

Flags are derived at query time from cached raw payloads, so config changes
take effect immediately — no cache flush needed. Sanity-check with a known
fully-enchanted character (should show "Fully enchanted & gemmed") and run
`pnpm test` in `apps/backend`.
