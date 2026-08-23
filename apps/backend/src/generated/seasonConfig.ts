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

// Raider.IO character-profile `raid_progression` field value: keyword scopes
// for current/previous expansion plus explicit slugs for older raids.
export const RAID_PROGRESSION_FIELD = "current-expansion:previous-expansion:awakened-amirdrassil-the-dreams-hope:awakened-aberrus-the-shadowed-crucible:awakened-vault-of-the-incarnates:amirdrassil-the-dreams-hope:aberrus-the-shadowed-crucible:vault-of-the-incarnates";

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
