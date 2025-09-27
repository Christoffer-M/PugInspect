export interface RaiderIoCharacterSearchApiResponse {
  matches: Match[];
}

export interface Match {
  type: string; // e.g., "character"
  name: string; // e.g., "Ceasevoker"
  data: CharacterData;
}

enum Type {
  Character = "character",
  Guild = "guild",
  Team = "team",
}

export interface CharacterData {
  id: number;
  name: string;
  faction: "horde" | "alliance";
  region: Region;
  realm: Realm;
  class: CharacterClass;
}

export interface Region {
  name: string; // e.g., "Europe"
  slug: string; // e.g., "eu"
  short_name: string; // e.g., "EU"
}

export interface Realm {
  id: number;
  connectedRealmId: number;
  wowRealmId: number;
  wowConnectedRealmId: number;
  name: string; // e.g., "Kazzak"
  altName: string | null;
  slug: string;
  altSlug: string | null;
  locale: string; // e.g., "en_GB"
  isConnected: boolean;
  realmType: string; // e.g., "live"
}

export interface CharacterClass {
  id: number;
  name: string; // e.g., "Evoker"
  slug: string; // e.g., "evoker"
}
