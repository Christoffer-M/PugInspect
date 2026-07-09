import { Dungeon } from "./dungeon";

export const MID_S1_DUNGEONS: Dungeon[] = [
  {
    id: 14032,
    challenge_mode_id: 402,
    slug: "algethar-academy",
    name: "Algeth'ar Academy",
    short_name: "AA",
    keystone_timer_seconds: 1770,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_dragonacademy.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion9/base/algethar-academy.jpg",
  },
  {
    id: 15829,
    challenge_mode_id: 558,
    slug: "magisters-terrace",
    name: "Magisters' Terrace",
    short_name: "MT",
    keystone_timer_seconds: 2010,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_magistersterrace.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion11/base/magisters-terrace.jpg",
  },
  {
    id: 16395,
    challenge_mode_id: 560,
    slug: "maisara-caverns",
    name: "Maisara Caverns",
    short_name: "MC",
    keystone_timer_seconds: 1980,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_maisarahills.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion11/base/maisara-caverns.jpg",
  },
  {
    id: 16573,
    challenge_mode_id: 559,
    slug: "nexuspoint-xenas",
    name: "Nexus-Point Xenas",
    short_name: "NPX",
    keystone_timer_seconds: 1770,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_voidscararena.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion11/base/nexuspoint-xenas.jpg",
  },
  {
    id: 4813,
    challenge_mode_id: 556,
    slug: "pit-of-saron",
    name: "Pit of Saron",
    short_name: "POS",
    keystone_timer_seconds: 1860,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_icecrown_pitofsaron.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion2/base/pit-of-saron.jpg",
  },
  {
    id: 8910,
    challenge_mode_id: 239,
    slug: "seat-of-the-triumvirate",
    name: "Seat of the Triumvirate",
    short_name: "SEAT",
    keystone_timer_seconds: 2100,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/achievement_boss_triumvirate_darknaaru.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion6/base/seat-of-the-triumvirate.jpg",
  },
  {
    id: 6988,
    challenge_mode_id: 161,
    slug: "skyreach",
    name: "Skyreach",
    short_name: "SR",
    keystone_timer_seconds: 1680,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/achievement_dungeon_arakkoaspires.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion5/base/skyreach.jpg",
  },
  {
    id: 15808,
    challenge_mode_id: 557,
    slug: "windrunner-spire",
    name: "Windrunner Spire",
    short_name: "WS",
    keystone_timer_seconds: 2010,
    icon_url:
      "https://cdn.raiderio.net/images/wow/icons/large/inv_achievement_dungeon_windrunnerspire.jpg",
    background_image_url:
      "https://cdn.raiderio.net/images/dungeons/expansion11/base/windrunner-spire.jpg",
  },
];

// SEASON-CONFIG: current season's dungeon pool — add a new dungeons_<season>.ts
// and point this re-export at it when the season changes.
export { MID_S1_DUNGEONS as CURRENT_DUNGEONS };
