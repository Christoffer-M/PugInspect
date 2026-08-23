import type { SpecRole } from "@repo/graphql-types";

/**
 * SEASON-CONFIG: the canonical class/spec roster and each spec's role.
 *
 * WarcraftLogs exposes the roster at `gameData.classes { specs }` but has no
 * role field, so this stays hand-maintained. Slugs are exactly what the rankings
 * payload returns — no spaces ("DeathKnight", "BeastMastery"). Revisit at an
 * expansion boundary when specs are added, removed, or change role.
 */
export type SpecDef = {
  /** WCL class slug, e.g. "DeathKnight". */
  classSlug: string;
  /** WCL spec slug, e.g. "BeastMastery". */
  specSlug: string;
  className: string;
  specName: string;
  role: SpecRole;
};

const T = "TANK" as const;
const H = "HEALER" as const;
const D = "DPS" as const;

// classSlug, className, [specSlug, specName, role][]
const ROSTER: [string, string, [string, string, SpecRole][]][] = [
  ["DeathKnight", "Death Knight", [["Blood", "Blood", T], ["Frost", "Frost", D], ["Unholy", "Unholy", D]]],
  ["DemonHunter", "Demon Hunter", [["Havoc", "Havoc", D], ["Vengeance", "Vengeance", T], ["Devourer", "Devourer", D]]],
  ["Druid", "Druid", [["Balance", "Balance", D], ["Feral", "Feral", D], ["Guardian", "Guardian", T], ["Restoration", "Restoration", H]]],
  ["Evoker", "Evoker", [["Devastation", "Devastation", D], ["Preservation", "Preservation", H], ["Augmentation", "Augmentation", D]]],
  ["Hunter", "Hunter", [["BeastMastery", "Beast Mastery", D], ["Marksmanship", "Marksmanship", D], ["Survival", "Survival", D]]],
  ["Mage", "Mage", [["Arcane", "Arcane", D], ["Fire", "Fire", D], ["Frost", "Frost", D]]],
  ["Monk", "Monk", [["Brewmaster", "Brewmaster", T], ["Mistweaver", "Mistweaver", H], ["Windwalker", "Windwalker", D]]],
  ["Paladin", "Paladin", [["Holy", "Holy", H], ["Protection", "Protection", T], ["Retribution", "Retribution", D]]],
  ["Priest", "Priest", [["Discipline", "Discipline", H], ["Holy", "Holy", H], ["Shadow", "Shadow", D]]],
  ["Rogue", "Rogue", [["Assassination", "Assassination", D], ["Subtlety", "Subtlety", D], ["Outlaw", "Outlaw", D]]],
  ["Shaman", "Shaman", [["Elemental", "Elemental", D], ["Enhancement", "Enhancement", D], ["Restoration", "Restoration", H]]],
  ["Warlock", "Warlock", [["Affliction", "Affliction", D], ["Demonology", "Demonology", D], ["Destruction", "Destruction", D]]],
  ["Warrior", "Warrior", [["Arms", "Arms", D], ["Fury", "Fury", D], ["Protection", "Protection", T]]],
];

export const SPECS: SpecDef[] = ROSTER.flatMap(([classSlug, className, specs]) =>
  specs.map(([specSlug, specName, role]) => ({ classSlug, specSlug, className, specName, role }))
);

export const specKey = (classSlug: string, specSlug: string) => `${classSlug}/${specSlug}`;

const BY_KEY = new Map(SPECS.map((s) => [specKey(s.classSlug, s.specSlug), s]));

export const lookupSpec = (classSlug?: string, specSlug?: string): SpecDef | undefined =>
  classSlug && specSlug ? BY_KEY.get(specKey(classSlug, specSlug)) : undefined;

/** Healers are ranked on healing, everyone else on damage. */
export const metricForRole = (role: SpecRole): "dps" | "hps" => (role === "HEALER" ? "hps" : "dps");
