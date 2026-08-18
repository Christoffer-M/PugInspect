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
  },
  "season-mn-2": {
    "zoneId": 55,
    "displayName": "Season 2 - Midnight",
    "expansion": 11
  }
};

export const DEFAULT_MYTHIC_PLUS_SEASON = "season-mn-2";

export const RAIDS: Record<string, RaidInfo> = {
  "the-tidebound-grotto": {
    "displayName": "The Tidebound Grotto",
    "expansion": 11
  },
  "the-venomous-abyss": {
    "zoneId": 53,
    "displayName": "The Venomous Abyss",
    "expansion": 11
  },
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

export const DEFAULT_RAID = "the-venomous-abyss";

export const TIER_SET_RANGES: { from: number; to: number; tier: number }[] = [
  {
    "from": 2055,
    "to": 2067,
    "tier": 36
  },
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
    "id": 16865,
    "challenge_mode_id": 588,
    "slug": "altar-of-fangs",
    "name": "Altar of Fangs",
    "short_name": "AOF",
    "keystone_timer_seconds": 1800,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_altaroffangs.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/altar-of-fangs.jpg"
  },
  {
    "id": 16368,
    "challenge_mode_id": 586,
    "slug": "den-of-nalorakk",
    "name": "Den of Nalorakk",
    "short_name": "DON",
    "keystone_timer_seconds": 1920,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_proveyourworth.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/den-of-nalorakk.jpg"
  },
  {
    "id": 9526,
    "challenge_mode_id": 249,
    "slug": "kings-rest",
    "name": "Kings' Rest",
    "short_name": "KR",
    "keystone_timer_seconds": 1980,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_kingsrest.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion7/base/kings-rest.jpg"
  },
  {
    "id": 16091,
    "challenge_mode_id": 587,
    "slug": "murder-row",
    "name": "Murder Row",
    "short_name": "MR",
    "keystone_timer_seconds": 2040,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_murderrow.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/murder-row.jpg"
  },
  {
    "id": 14063,
    "challenge_mode_id": 399,
    "slug": "ruby-life-pools",
    "name": "Ruby Life Pools",
    "short_name": "RLP",
    "keystone_timer_seconds": 1680,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_lifepools.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion9/base/ruby-life-pools.jpg"
  },
  {
    "id": 9527,
    "challenge_mode_id": 250,
    "slug": "temple-of-sethraliss",
    "name": "Temple of Sethraliss",
    "short_name": "TOS",
    "keystone_timer_seconds": 1980,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_templeofsethraliss.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion7/base/temple-of-sethraliss.jpg"
  },
  {
    "id": 16359,
    "challenge_mode_id": 584,
    "slug": "the-blinding-vale",
    "name": "The Blinding Vale",
    "short_name": "BV",
    "keystone_timer_seconds": 1980,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_lightbloom.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/the-blinding-vale.jpg"
  },
  {
    "id": 16425,
    "challenge_mode_id": 585,
    "slug": "voidscar-arena",
    "name": "Voidscar Arena",
    "short_name": "VSA",
    "keystone_timer_seconds": 1800,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_voidscararena.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/voidscar-arena.jpg"
  }
];

export const MAX_LEVEL = 90;
