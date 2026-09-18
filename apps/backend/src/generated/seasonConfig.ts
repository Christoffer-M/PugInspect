// GENERATED FILE — do not edit by hand.
// Regenerate with `pnpm season:update` (scripts/update-season-config.mts),
// then review the diff. Sources: Raider.IO static-data, WarcraftLogs zones,
// Blizzard item-set index.

export type MythicPlusSeason = {
  zoneId?: number;
  displayName: string;
  expansion: number;
};

export type Dungeon = {
  id: number;
  challenge_mode_id: number;
  slug: string;
  name: string;
  short_name: string;
  keystone_timer_seconds: number;
  icon_url: string;
  background_image_url: string;
};

export type RaidInfo = {
  /** Blizzard journal instances whose kills make up this raid's progression. */
  instanceIds: number[];
  bosses: number;
};

export const DEFAULT_RAID = "the-venomous-abyss";

// Needed by the Mythic+ spec-meta crawler, which iterates zones/encounters
// server-side rather than taking them as a client argument.
export const MYTHIC_PLUS_SEASONS: Record<string, MythicPlusSeason> = {
  "season-mn-2": {
    "zoneId": 55,
    "displayName": "Season 2",
    "expansion": 11
  },
  "season-mn-1": {
    "zoneId": 47,
    "displayName": "Season 1",
    "expansion": 11
  }
};

export const DEFAULT_MYTHIC_PLUS_SEASON = "season-mn-2";

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
    "keystone_timer_seconds": 1920,
    "icon_url": "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_templeofsethraliss.jpg",
    "background_image_url": "https://cdn.raiderio.net/images/dungeons/expansion7/base/temple-of-sethraliss.jpg"
  },
  {
    "id": 16359,
    "challenge_mode_id": 584,
    "slug": "the-blinding-vale",
    "name": "The Blinding Vale",
    "short_name": "BV",
    "keystone_timer_seconds": 1800,
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

// Blizzard Mythic+ season id → Raider.IO season slug: the season's label and
// the key for its score colour scale.
export const MYTHIC_PLUS_SEASON_SLUGS: Record<number, string> = {
  "13": "season-tww-1",
  "14": "season-tww-2",
  "15": "season-tww-3",
  "17": "season-mn-1",
  "18": "season-mn-2"
};

// Raids Blizzard tracks progression for, keyed by the slug every client looks
// progression up by. Resolved from the Blizzard journal at generation time;
// see resolveJournalInstances in the generator.
export const RAIDS: Record<string, RaidInfo> = {
  "the-venomous-abyss": {
    "instanceIds": [
      1320
    ],
    "bosses": 8
  },
  "sporefall": {
    "instanceIds": [
      1305
    ],
    "bosses": 1
  },
  "tier-mn-1": {
    "instanceIds": [
      1314,
      1307,
      1308
    ],
    "bosses": 9
  },
  "manaforge-omega": {
    "instanceIds": [
      1302
    ],
    "bosses": 8
  },
  "liberation-of-undermine": {
    "instanceIds": [
      1296
    ],
    "bosses": 8
  },
  "nerubar-palace": {
    "instanceIds": [
      1273
    ],
    "bosses": 8
  },
  "amirdrassil-the-dreams-hope": {
    "instanceIds": [
      1207
    ],
    "bosses": 9
  },
  "aberrus-the-shadowed-crucible": {
    "instanceIds": [
      1208
    ],
    "bosses": 9
  },
  "vault-of-the-incarnates": {
    "instanceIds": [
      1200
    ],
    "bosses": 8
  }
};

// Slots expected to carry a permanent enchant this era.
export const ENCHANTABLE_SLOTS = [
  "HEAD",
  "SHOULDER",
  "CHEST",
  "LEGS",
  "FEET",
  "FINGER_1",
  "FINGER_2",
  "MAIN_HAND"
];
