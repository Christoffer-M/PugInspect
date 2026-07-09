# Agent Instructions

## Seasonal / expansion config changes

Game knowledge that no API exposes (enchantable slots, max level, raid tiers,
M+ seasons, dungeon pools) is hardcoded behind `SEASON-CONFIG:` comment tags.

When making any seasonal config change:

1. `grep -rn "SEASON-CONFIG" apps/` to find **all** sites — several constants
   travel together (e.g. `DEFAULT_RAID` exists in both frontend and backend).
2. **Update `docs/SEASONAL_UPDATES.md` to match**: if you add, move, remove, or
   change the meaning of a seasonal constant, the checklist must reflect it.
3. Tag any new season-dependent constant with a `SEASON-CONFIG:` comment so the
   grep stays complete.

See `docs/SEASONAL_UPDATES.md` for the per-event checklist (new M+ season, new
raid tier, new expansion) and verification steps.
