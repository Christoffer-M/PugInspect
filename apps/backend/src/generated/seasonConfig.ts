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
  /** Raider.IO's name, which is Blizzard's instance name for single-instance raids. */
  name: string;
  encounters: string[];
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

// Raids newest first, keyed by slug (the key every client looks progression up
// by). Blizzard's per-instance kills are mapped onto these; see
// blizzardProgression.mapper.ts.
export const RAIDS: Record<string, RaidInfo> = {
  "the-venomous-abyss": {
    "name": "The Venomous Abyss",
    "encounters": [
      "Nek'zali the Soulcoiler",
      "Entombed Sentinels",
      "The Lost Explorers",
      "Vashnik the Malignant",
      "Sszorak",
      "The Twin Fangs",
      "The Coiled Altar",
      "Ula'tek"
    ]
  },
  "sporefall": {
    "name": "Sporefall",
    "encounters": [
      "Rotmire"
    ]
  },
  "tier-mn-1": {
    "name": "MN Tier 1 (VS / DR / MQD)",
    "encounters": [
      "Imperator Averzian",
      "Vorasius",
      "Fallen-King Salhadaar",
      "Vaelgor & Ezzorak",
      "Lightblinded Vanguard",
      "Crown of the Cosmos",
      "Chimaerus the Undreamt God",
      "Belo'ren, Child of Al'ar",
      "Midnight Falls"
    ]
  },
  "manaforge-omega": {
    "name": "Manaforge Omega",
    "encounters": [
      "Plexus Sentinel",
      "Loom'ithar",
      "Soulbinder Naazindhri",
      "Forgeweaver Araz",
      "The Soul Hunters",
      "Fractillus",
      "Nexus-King Salhadaar",
      "Dimensius"
    ]
  },
  "liberation-of-undermine": {
    "name": "Liberation of Undermine",
    "encounters": [
      "Vexie and the Geargrinders",
      "Cauldron of Carnage",
      "Rik Reverb",
      "Stix Bunkjunker",
      "Sprocketmonger Lockenstock",
      "One-Armed Bandit",
      "Mug'Zee, Heads of Security",
      "Chrome King Gallywix"
    ]
  },
  "blackrock-depths": {
    "name": "Blackrock Depths",
    "encounters": [
      "Lord Roccor",
      "Bael'Gar",
      "Lord Incendius",
      "Golem Lord Argelmach",
      "The Seven",
      "General Angerforge",
      "Ambassador Flamelash",
      "Emperor Dagran Thaurissan"
    ]
  },
  "nerubar-palace": {
    "name": "Nerub-ar Palace",
    "encounters": [
      "Ulgrax the Devourer",
      "The Bloodbound Horror",
      "Sikran",
      "Rasha'nan",
      "Broodtwister Ovi'nax",
      "Nexus-Princess Ky'veza",
      "The Silken Court",
      "Queen Ansurek"
    ]
  },
  "awakened-amirdrassil-the-dreams-hope": {
    "name": "Awakened Amirdrassil, the Dream's Hope",
    "encounters": [
      "Awakened Gnarlroot",
      "Awakened Igira the Cruel",
      "Awakened Volcoross",
      "Awakened Council of Dreams",
      "Awakened Larodar, Keeper of the Flame",
      "Awakened Nymue, Weaver of the Cycle",
      "Awakened Smolderon",
      "Awakened Tindral Sageswift, Seer of the Flame",
      "Awakened Fyrakk the Blazing"
    ]
  },
  "awakened-aberrus-the-shadowed-crucible": {
    "name": "Awakened Aberrus, the Shadowed Crucible",
    "encounters": [
      "Awakened Kazzara, the Hellforged",
      "Awakened The Amalgamation Chamber",
      "Awakened The Forgotten Experiments",
      "Awakened Assault of the Zaqali",
      "Awakened Rashok, the Elder",
      "Awakened The Vigilant Steward, Zskarn",
      "Awakened Magmorax",
      "Awakened Echo of Neltharion",
      "Awakened Scalecommander Sarkareth"
    ]
  },
  "awakened-vault-of-the-incarnates": {
    "name": "Awakened Vault of the Incarnates",
    "encounters": [
      "Awakened Eranog",
      "Awakened Terros",
      "Awakened The Primal Council",
      "Awakened Sennarth, the Cold Breath",
      "Awakened Dathea, Ascended",
      "Awakened Kurog Grimtotem",
      "Awakened Broodkeeper Diurna",
      "Awakened Raszageth the Storm-Eater"
    ]
  },
  "amirdrassil-the-dreams-hope": {
    "name": "Amirdrassil, the Dream's Hope",
    "encounters": [
      "Gnarlroot",
      "Igira the Cruel",
      "Volcoross",
      "Council of Dreams",
      "Larodar, Keeper of the Flame",
      "Nymue, Weaver of the Cycle",
      "Smolderon",
      "Tindral Sageswift, Seer of the Flame",
      "Fyrakk the Blazing"
    ]
  },
  "aberrus-the-shadowed-crucible": {
    "name": "Aberrus, the Shadowed Crucible",
    "encounters": [
      "Kazzara, the Hellforged",
      "The Amalgamation Chamber",
      "The Forgotten Experiments",
      "Assault of the Zaqali",
      "Rashok, the Elder",
      "The Vigilant Steward, Zskarn",
      "Magmorax",
      "Echo of Neltharion",
      "Scalecommander Sarkareth"
    ]
  },
  "vault-of-the-incarnates": {
    "name": "Vault of the Incarnates",
    "encounters": [
      "Eranog",
      "Terros",
      "The Primal Council",
      "Sennarth, the Cold Breath",
      "Dathea, Ascended",
      "Kurog Grimtotem",
      "Broodkeeper Diurna",
      "Raszageth the Storm-Eater"
    ]
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
