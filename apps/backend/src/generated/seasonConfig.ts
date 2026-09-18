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

// Raider.IO's final rating colour scale for the previous season, as
// [minimum rating, colour], highest first. The live season's scale moves, so
// the backend fetches that one at runtime instead.
export const PREVIOUS_SEASON_SCORE_TIERS: { season: string | null; tiers: [number, string][] } = {
  season: "season-mn-1",
  tiers: [
    [4375, "#ff8000"],
    [4310, "#fe7e15"],
    [4290, "#fd7c21"],
    [4265, "#fc7a2b"],
    [4240, "#fb7833"],
    [4215, "#f9763b"],
    [4190, "#f87441"],
    [4170, "#f77248"],
    [4145, "#f5704e"],
    [4120, "#f46e54"],
    [4095, "#f36b5a"],
    [4070, "#f16960"],
    [4050, "#ef6765"],
    [4025, "#ee656b"],
    [4000, "#ec6370"],
    [3975, "#ea6175"],
    [3950, "#e95f7b"],
    [3930, "#e75d80"],
    [3905, "#e55b85"],
    [3880, "#e3598b"],
    [3855, "#e05790"],
    [3830, "#de5595"],
    [3810, "#dc539a"],
    [3785, "#d9519f"],
    [3760, "#d74fa5"],
    [3735, "#d44daa"],
    [3710, "#d24baf"],
    [3690, "#cf49b4"],
    [3665, "#cc47b9"],
    [3640, "#c845bf"],
    [3615, "#c543c4"],
    [3590, "#c241c9"],
    [3570, "#be3fce"],
    [3545, "#ba3ed4"],
    [3520, "#b63cd9"],
    [3495, "#b23ade"],
    [3470, "#ad38e3"],
    [3450, "#a837e9"],
    [3425, "#a335ee"],
    [3385, "#9d3ded"],
    [3360, "#9643ec"],
    [3340, "#8f49ea"],
    [3315, "#884ee9"],
    [3290, "#8153e8"],
    [3265, "#7957e7"],
    [3240, "#715be5"],
    [3220, "#695ee4"],
    [3195, "#5f62e3"],
    [3170, "#5565e2"],
    [3145, "#4968e1"],
    [3120, "#3b6bdf"],
    [3100, "#286dde"],
    [3075, "#0070dd"],
    [3020, "#2075d8"],
    [2995, "#2f79d3"],
    [2975, "#397ece"],
    [2950, "#4183c9"],
    [2925, "#4788c4"],
    [2900, "#4c8cbf"],
    [2875, "#5191ba"],
    [2855, "#5496b5"],
    [2830, "#579bb0"],
    [2805, "#5aa0aa"],
    [2780, "#5ca5a5"],
    [2755, "#5da9a0"],
    [2735, "#5eae9a"],
    [2710, "#5fb395"],
    [2685, "#5fb88f"],
    [2660, "#5fbd89"],
    [2635, "#5fc283"],
    [2615, "#5ec77d"],
    [2590, "#5ccc77"],
    [2565, "#5ad171"],
    [2540, "#58d66a"],
    [2515, "#55db63"],
    [2495, "#51e05b"],
    [2470, "#4de553"],
    [2445, "#47eb4a"],
    [2420, "#41f03f"],
    [2395, "#39f533"],
    [2375, "#2efa22"],
    [2350, "#1eff00"],
    [2325, "#29ff0e"],
    [2300, "#31ff18"],
    [2275, "#38ff1f"],
    [2250, "#3eff25"],
    [2225, "#44ff2b"],
    [2200, "#49ff30"],
    [2175, "#4eff34"],
    [2150, "#52ff38"],
    [2125, "#57ff3c"],
    [2100, "#5bff40"],
    [2075, "#5fff43"],
    [2050, "#62ff47"],
    [2025, "#66ff4a"],
    [2000, "#69ff4e"],
    [1975, "#6dff51"],
    [1950, "#70ff54"],
    [1925, "#73ff57"],
    [1900, "#76ff5a"],
    [1875, "#79ff5d"],
    [1850, "#7cff60"],
    [1825, "#7fff62"],
    [1800, "#82ff65"],
    [1775, "#84ff68"],
    [1750, "#87ff6b"],
    [1725, "#8aff6d"],
    [1700, "#8cff70"],
    [1675, "#8fff73"],
    [1650, "#91ff75"],
    [1625, "#94ff78"],
    [1600, "#96ff7a"],
    [1575, "#98ff7d"],
    [1550, "#9bff7f"],
    [1525, "#9dff82"],
    [1500, "#9fff84"],
    [1475, "#a2ff87"],
    [1450, "#a4ff89"],
    [1425, "#a6ff8c"],
    [1400, "#a8ff8e"],
    [1375, "#aaff91"],
    [1350, "#adff93"],
    [1325, "#afff96"],
    [1300, "#b1ff98"],
    [1275, "#b3ff9b"],
    [1250, "#b5ff9d"],
    [1225, "#b7ff9f"],
    [1200, "#b9ffa2"],
    [1175, "#bbffa4"],
    [1150, "#bdffa6"],
    [1125, "#bfffa9"],
    [1100, "#c1ffab"],
    [1075, "#c3ffae"],
    [1050, "#c5ffb0"],
    [1025, "#c7ffb2"],
    [1000, "#c8ffb5"],
    [975, "#caffb7"],
    [950, "#ccffb9"],
    [925, "#ceffbc"],
    [900, "#d0ffbe"],
    [875, "#d2ffc0"],
    [850, "#d3ffc3"],
    [825, "#d5ffc5"],
    [800, "#d7ffc7"],
    [775, "#d9ffca"],
    [750, "#dbffcc"],
    [725, "#dcffce"],
    [700, "#deffd1"],
    [675, "#e0ffd3"],
    [650, "#e2ffd5"],
    [625, "#e3ffd8"],
    [600, "#e5ffda"],
    [575, "#e7ffdc"],
    [550, "#e8ffdf"],
    [525, "#eaffe1"],
    [500, "#ecffe3"],
    [475, "#edffe6"],
    [450, "#efffe8"],
    [425, "#f1ffea"],
    [400, "#f2ffec"],
    [375, "#f4ffef"],
    [350, "#f5fff1"],
    [325, "#f7fff3"],
    [300, "#f9fff6"],
    [275, "#fafff8"],
    [250, "#fcfffa"],
    [225, "#fdfffd"],
    [200, "#ffffff"],
  ],
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
