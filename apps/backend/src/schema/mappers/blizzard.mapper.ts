import type { BlizzardCharacterProfile } from "../services/blizzard/model/CharacterProfile.js";
import type { Guild } from "@repo/graphql-types";

export interface BlizzardCharacterFields {
  class: string;
  race: string;
  activeSpec: string;
  faction: string;
  gender: string;
  level: number;
  equippedItemLevel: number;
  averageItemLevel: number;
  achievementPoints: number;
  guild: Guild | null;
  avatarUrl: string | null;
}

export function mapBlizzardCharacter(
  profile: BlizzardCharacterProfile,
  avatarUrl: string | null
): BlizzardCharacterFields {
  return {
    class: profile.character_class.name,
    race: profile.race.name,
    activeSpec: profile.active_spec.name,
    faction: profile.faction.name,
    gender: profile.gender.name,
    level: profile.level,
    equippedItemLevel: profile.equipped_item_level,
    averageItemLevel: profile.average_item_level,
    achievementPoints: profile.achievement_points,
    guild: profile.guild
      ? { name: profile.guild.name, realm: profile.guild.realm.name }
      : null,
    avatarUrl,
  };
}
