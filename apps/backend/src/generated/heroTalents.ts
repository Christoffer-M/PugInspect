// GENERATED FILE — do not edit by hand.
// Regenerate with `pnpm season:update` (scripts/update-season-config.mts),
// then review the diff. Sources: Raider.IO static-data, WarcraftLogs zones,
// Blizzard item-set index.

// Trait-node-entry id → hero talent tree name. WarcraftLogs puts exactly one of
// these ids in a ranking row's `talents` array, which is what identifies the
// tree. Source: Raidbots talent dump (subTreeNodes entries).
export const HERO_TALENTS: Record<number, string> = {
  "123287": "Voidweaver",
  "123288": "Voidweaver",
  "123289": "Archon",
  "123290": "Oracle",
  "123291": "Archon",
  "123292": "Oracle",
  "123295": "Elune's Chosen",
  "123296": "Wildstalker",
  "123297": "Druid of the Claw",
  "123298": "Wildstalker",
  "123299": "Keeper of the Grove",
  "123300": "Keeper of the Grove",
  "123301": "Druid of the Claw",
  "123302": "Elune's Chosen",
  "123321": "San'layn",
  "123322": "Rider of the Apocalypse",
  "123323": "Rider of the Apocalypse",
  "123324": "Deathbringer",
  "123325": "San'layn",
  "123326": "Deathbringer",
  "123328": "Aldrachi Reaver",
  "123329": "Fel-Scarred",
  "123330": "Aldrachi Reaver",
  "123331": "Scalecommander",
  "123332": "Flameshaper",
  "123333": "Scalecommander",
  "123334": "Chronowarden",
  "123335": "Chronowarden",
  "123336": "Flameshaper",
  "123339": "Spellslinger",
  "123340": "Sunfury",
  "123341": "Sunfury",
  "123342": "Frostfire",
  "123343": "Frostfire",
  "123344": "Spellslinger",
  "123345": "Sentinel",
  "123346": "Dark Ranger",
  "123347": "Pack Leader",
  "123348": "Dark Ranger",
  "123349": "Sentinel",
  "123350": "Pack Leader",
  "123357": "Templar",
  "123358": "Templar",
  "123359": "Lightsmith",
  "123360": "Herald of the Sun",
  "123361": "Lightsmith",
  "123362": "Herald of the Sun",
  "123370": "Trickster",
  "123371": "Fatebound",
  "123372": "Trickster",
  "123373": "Deathstalker",
  "123374": "Fatebound",
  "123375": "Deathstalker",
  "123376": "Stormbringer",
  "123377": "Farseer",
  "123378": "Totemic",
  "123379": "Totemic",
  "123380": "Farseer",
  "123381": "Stormbringer",
  "123382": "Hellcaller",
  "123383": "Soul Harvester",
  "123384": "Soul Harvester",
  "123385": "Diabolist",
  "123386": "Diabolist",
  "123387": "Hellcaller",
  "123388": "Mountain Thane",
  "123389": "Slayer",
  "123390": "Slayer",
  "123391": "Colossus",
  "123392": "Mountain Thane",
  "123393": "Colossus",
  "125027": "Shado-Pan",
  "125028": "Master of Harmony",
  "125044": "Master of Harmony",
  "125045": "Conduit of the Celestials",
  "125046": "Shado-Pan",
  "125047": "Conduit of the Celestials",
  "134251": "Annihilator",
  "134253": "Annihilator",
  "136623": "Void-Scarred"
};

// Every hero talent tree each spec CAN pick, keyed by WCL "classSlug/specSlug".
// The page lists a spec's full set so a tree nobody in the sample played reads
// as "nobody played it" rather than silently not existing.
export const HERO_TALENTS_BY_SPEC: Record<string, string[]> = {
  "Druid/Balance": [
    "Elune's Chosen",
    "Keeper of the Grove"
  ],
  "Druid/Feral": [
    "Druid of the Claw",
    "Wildstalker"
  ],
  "Druid/Guardian": [
    "Druid of the Claw",
    "Elune's Chosen"
  ],
  "Druid/Restoration": [
    "Keeper of the Grove",
    "Wildstalker"
  ],
  "Evoker/Devastation": [
    "Flameshaper",
    "Scalecommander"
  ],
  "Evoker/Preservation": [
    "Chronowarden",
    "Flameshaper"
  ],
  "Evoker/Augmentation": [
    "Chronowarden",
    "Scalecommander"
  ],
  "Priest/Discipline": [
    "Oracle",
    "Voidweaver"
  ],
  "Priest/Holy": [
    "Archon",
    "Oracle"
  ],
  "Priest/Shadow": [
    "Archon",
    "Voidweaver"
  ],
  "DeathKnight/Blood": [
    "Deathbringer",
    "San'layn"
  ],
  "DeathKnight/Frost": [
    "Deathbringer",
    "Rider of the Apocalypse"
  ],
  "DeathKnight/Unholy": [
    "Rider of the Apocalypse",
    "San'layn"
  ],
  "Hunter/BeastMastery": [
    "Dark Ranger",
    "Pack Leader"
  ],
  "Hunter/Marksmanship": [
    "Dark Ranger",
    "Sentinel"
  ],
  "Hunter/Survival": [
    "Pack Leader",
    "Sentinel"
  ],
  "Rogue/Assassination": [
    "Deathstalker",
    "Fatebound"
  ],
  "Rogue/Outlaw": [
    "Fatebound",
    "Trickster"
  ],
  "Rogue/Subtlety": [
    "Deathstalker",
    "Trickster"
  ],
  "Shaman/Elemental": [
    "Farseer",
    "Stormbringer"
  ],
  "Shaman/Enhancement": [
    "Stormbringer",
    "Totemic"
  ],
  "Shaman/Restoration": [
    "Farseer",
    "Totemic"
  ],
  "Paladin/Holy": [
    "Herald of the Sun",
    "Lightsmith"
  ],
  "Paladin/Protection": [
    "Lightsmith",
    "Templar"
  ],
  "Paladin/Retribution": [
    "Herald of the Sun",
    "Templar"
  ],
  "Mage/Arcane": [
    "Spellslinger",
    "Sunfury"
  ],
  "Mage/Fire": [
    "Frostfire",
    "Sunfury"
  ],
  "Mage/Frost": [
    "Frostfire",
    "Spellslinger"
  ],
  "Warrior/Arms": [
    "Colossus",
    "Slayer"
  ],
  "Warrior/Fury": [
    "Mountain Thane",
    "Slayer"
  ],
  "Warrior/Protection": [
    "Colossus",
    "Mountain Thane"
  ],
  "Warlock/Affliction": [
    "Hellcaller",
    "Soul Harvester"
  ],
  "Warlock/Demonology": [
    "Diabolist",
    "Soul Harvester"
  ],
  "Warlock/Destruction": [
    "Diabolist",
    "Hellcaller"
  ],
  "Monk/Brewmaster": [
    "Master of Harmony",
    "Shado-Pan"
  ],
  "Monk/Windwalker": [
    "Conduit of the Celestials",
    "Shado-Pan"
  ],
  "Monk/Mistweaver": [
    "Conduit of the Celestials",
    "Master of Harmony"
  ],
  "DemonHunter/Havoc": [
    "Aldrachi Reaver",
    "Fel-Scarred"
  ],
  "DemonHunter/Vengeance": [
    "Aldrachi Reaver",
    "Annihilator"
  ],
  "DemonHunter/Devourer": [
    "Annihilator",
    "Void-Scarred"
  ]
};
