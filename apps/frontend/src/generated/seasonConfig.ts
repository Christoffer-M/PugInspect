// GENERATED FILE — do not edit by hand.
// Regenerate with `pnpm season:update` (scripts/update-season-config.mts),
// then review the diff. Sources: Raider.IO static-data, WarcraftLogs zones,
// Blizzard item-set index.

import type { Dungeon } from "../data/dungeons/dungeon";

export type MythicPlusSeason = {
  zoneId?: number;
  displayName: string;
  expansion: number;
};

export type RaidInfo = {
  zoneId?: number;
  displayName: string;
  expansion: number;
};

export const EXPANSION_DISPLAY_NAMES: Record<number, string> = {
  "9": "Dragonflight",
  "10": "The War Within",
  "11": "Midnight"
};

export const MYTHIC_PLUS_SEASONS: Record<string, MythicPlusSeason> = {
  "season-mn-1": {
    "zoneId": 47,
    "displayName": "Season 1 - Midnight",
    "expansion": 11
  }
};

export const DEFAULT_MYTHIC_PLUS_SEASON = "season-mn-1";

export const RAIDS: Record<string, RaidInfo> = {
  "sporefall": {
    "zoneId": 50,
    "displayName": "Sporefall",
    "expansion": 11
  },
  "tier-mn-1": {
    "zoneId": 46,
    "displayName": "The Voidspire, The Dreamrift, March on Quel'Danas",
    "expansion": 11
  },
  "manaforge-omega": {
    "zoneId": 44,
    "displayName": "Manaforge Omega",
    "expansion": 10
  },
  "liberation-of-undermine": {
    "zoneId": 42,
    "displayName": "Liberation of Undermine",
    "expansion": 10
  },
  "blackrock-depths": {
    "zoneId": 40,
    "displayName": "Blackrock Depths",
    "expansion": 10
  },
  "nerubar-palace": {
    "zoneId": 38,
    "displayName": "Nerub-ar Palace",
    "expansion": 10
  },
  "awakened-amirdrassil-the-dreams-hope": {
    "zoneId": 35,
    "displayName": "Awakened Amirdrassil, the Dream's Hope",
    "expansion": 9
  },
  "awakened-aberrus-the-shadowed-crucible": {
    "zoneId": 33,
    "displayName": "Awakened Aberrus, the Shadowed Crucible",
    "expansion": 9
  },
  "awakened-vault-of-the-incarnates": {
    "zoneId": 31,
    "displayName": "Awakened Vault of the Incarnates",
    "expansion": 9
  },
  "amirdrassil-the-dreams-hope": {
    "zoneId": 35,
    "displayName": "Amirdrassil, the Dream's Hope",
    "expansion": 9
  },
  "aberrus-the-shadowed-crucible": {
    "zoneId": 33,
    "displayName": "Aberrus, the Shadowed Crucible",
    "expansion": 9
  },
  "vault-of-the-incarnates": {
    "zoneId": 31,
    "displayName": "Vault of the Incarnates",
    "expansion": 9
  }
};

export const DEFAULT_RAID = "tier-mn-1";

export const TIER_SET_RANGES: { from: number; to: number; tier: number }[] = [
  {
    "from": 1978,
    "to": 1990,
    "tier": 35
  },
  {
    "from": 1919,
    "to": 1931,
    "tier": 34
  },
  {
    "from": 1867,
    "to": 1879,
    "tier": 33
  }
];

export const CURRENT_DUNGEONS: Dungeon[] = [
  {
    "id": 14032,
    "challenge_mode_id": 402,
    "slug": "algethar-academy",
    "name": "Algeth'ar Academy",
    "short_name": "AA",
    "keystone_timer_seconds": 1820,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_dragonacademy.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion9/base/algethar-academy.jpg"
  },
  {
    "id": 15829,
    "challenge_mode_id": 558,
    "slug": "magisters-terrace",
    "name": "Magisters' Terrace",
    "short_name": "MT",
    "keystone_timer_seconds": 2000,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_magistersterrace.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/magisters-terrace.jpg"
  },
  {
    "id": 16395,
    "challenge_mode_id": 560,
    "slug": "maisara-caverns",
    "name": "Maisara Caverns",
    "short_name": "MC",
    "keystone_timer_seconds": 1680,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_maisarahills.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/maisara-caverns.jpg"
  },
  {
    "id": 16573,
    "challenge_mode_id": 559,
    "slug": "nexuspoint-xenas",
    "name": "Nexus-Point Xenas",
    "short_name": "NPX",
    "keystone_timer_seconds": 1600,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_voidscararena.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/nexuspoint-xenas.jpg"
  },
  {
    "id": 4813,
    "challenge_mode_id": 556,
    "slug": "pit-of-saron",
    "name": "Pit of Saron",
    "short_name": "POS",
    "keystone_timer_seconds": 1800,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_icecrown_pitofsaron.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion2/base/pit-of-saron.jpg"
  },
  {
    "id": 8910,
    "challenge_mode_id": 239,
    "slug": "seat-of-the-triumvirate",
    "name": "Seat of the Triumvirate",
    "short_name": "SEAT",
    "keystone_timer_seconds": 2040,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_boss_triumvirate_darknaaru.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion6/base/seat-of-the-triumvirate.jpg"
  },
  {
    "id": 6988,
    "challenge_mode_id": 161,
    "slug": "skyreach",
    "name": "Skyreach",
    "short_name": "SR",
    "keystone_timer_seconds": 1680,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_arakkoaspires.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion5/base/skyreach.jpg"
  },
  {
    "id": 15808,
    "challenge_mode_id": 557,
    "slug": "windrunner-spire",
    "name": "Windrunner Spire",
    "short_name": "WS",
    "keystone_timer_seconds": 1980,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_windrunnerspire.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/windrunner-spire.jpg"
  }
];

export const MAX_LEVEL = 90;
