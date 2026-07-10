/**
 * SEASON-CONFIG: ALL hand-maintained seasonal inputs live in this file;
 * everything else is fetched from live APIs by update-season-config.mts.
 * After editing, run `pnpm season:update` and review the diff.
 * See docs/SEASONAL_UPDATES.md.
 */

// Bump at an expansion boundary (first entry = current, drives M+ seasons
// and defaults).
export const EXPANSIONS = [
  { rioId: 11, name: "Midnight" }, // current
  { rioId: 10, name: "The War Within" }, // previous — raids still shown in profiles
  { rioId: 9, name: "Dragonflight" }, // previous — raids still shown in profiles
];

// Current level cap — gates the frontend's gear-check warnings so leveling
// characters aren't flagged for incomplete enchants/gems.
export const MAX_LEVEL = 90;

// Slots expected to carry a PERMANENT enchant this era (Midnight: helm and
// shoulder enchants returned, cloak and bracer were removed; legs count via
// profession armor kits, which the API reports as enchantments). Verify
// against a well-geared character each season — enchant display strings name
// the slot ("Enchant Helm - …"). OFF_HAND is special-cased in gear.mapper.ts.
export const ENCHANTABLE_SLOTS = [
  "HEAD", "SHOULDER", "CHEST", "LEGS", "FEET", "FINGER_1", "FINGER_2", "MAIN_HAND",
];

// Prettier display names than Raider.IO's, for multi-raid tiers.
export const RAID_DISPLAY_OVERRIDES: Record<string, string> = {
  "tier-mn-1": "The Voidspire, The Dreamrift, March on Quel'Danas",
};

// Known tier-set id blocks. New contiguous runs of exactly 13 item-set ids
// above the newest block are detected automatically and numbered +1 each.
export const TIER_SEED = [
  { from: 1978, to: 1990, tier: 35 }, // Midnight S1 — Voidspire / Dreamrift
  { from: 1919, to: 1931, tier: 34 }, // TWW S3 — Manaforge Omega
  { from: 1867, to: 1879, tier: 33 }, // TWW S2 — Liberation of Undermine
];
