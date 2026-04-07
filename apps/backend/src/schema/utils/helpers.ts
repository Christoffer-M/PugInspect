import { Difficulty, InputMaybe } from "@repo/graphql-types";

/** Canonical WoW realm slug: lowercase, apostrophes removed, spaces → dashes. Dashes are preserved. */
export function normalizeRealm(realm: string): string {
  return realm
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\s+/g, "-");
}

/** Canonical character name: lowercase, trimmed. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export const mapDifficultyIdToName = (
  difficulty?: number | InputMaybe<number>
): Difficulty | null => {
  switch (difficulty) {
    case 1:
      return "LFR";
    case 3:
      return "Normal";
    case 4:
      return "Heroic";
    case 5:
      return "Mythic";
    default:
      return null;
  }
};

export function toFixedNumber(
  value: number | undefined,
  digits = 2
): number | null {
  return typeof value === "number" ? parseFloat(value.toFixed(digits)) : null;
}
