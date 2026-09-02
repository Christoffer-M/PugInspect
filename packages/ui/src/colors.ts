export function getParseColor(percent: number | null | undefined): string {
  if (percent == null) return "#5e6a82";
  if (percent < 25) return "#7a8290";
  if (percent < 50) return "#4ade80";
  if (percent < 75) return "#4d93ff";
  if (percent < 95) return "#b072f0";
  if (percent < 99) return "#ff8a3d";
  if (percent < 100) return "#ff6fae";
  return "#ffd34d";
}

export const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B3A",
};

export function getClassColor(className?: string | null): string {
  if (!className) return "#8a96aa";
  return CLASS_COLORS[className.toLowerCase()] ?? "#8a96aa";
}

/** Standard WoW item quality colors, keyed by the API's quality type token. */
export const WOW_QUALITY_COLORS: Record<string, string> = {
  POOR: "#9d9d9d",
  COMMON: "#ffffff",
  UNCOMMON: "#1eff00",
  RARE: "#0070dd",
  EPIC: "#a335ee",
  LEGENDARY: "#ff8000",
  ARTIFACT: "#e6cc80",
  HEIRLOOM: "#00ccff",
};

export function getQualityColor(quality?: string | null): string {
  if (!quality) return "#8a96aa";
  return WOW_QUALITY_COLORS[quality.toUpperCase()] ?? "#8a96aa";
}

export const RAID_DIFFICULTY_COLORS = {
  normal: "#22c55e",
  heroic: "#3b82f6",
  mythic: "#f4a50e",
} as const;

export const ROLE_COLORS: Record<string, string> = {
  TANK: "#3b82f6",
  HEALER: "#22c55e",
  DPS: "#f4a50e",
};
