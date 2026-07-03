import { describe, it, expect } from "vitest";
import { mapBlizzardCharacter } from "./blizzard.mapper.js";
import type {
  BlizzardCharacterProfile,
  BlizzardLink,
} from "../services/blizzard/model/CharacterProfile.js";

const link: BlizzardLink = { href: "https://eu.api.blizzard.com/stub" };
const keyed = (name: string, id: number) => ({ key: link, name, id });

const profile: BlizzardCharacterProfile = {
  _links: { self: link },
  id: 123456,
  name: "Pugsley",
  gender: { type: "MALE", name: "Male" },
  faction: { type: "HORDE", name: "Horde" },
  race: keyed("Orc", 2),
  character_class: keyed("Shaman", 7),
  active_spec: keyed("Enhancement", 263),
  realm: { key: link, name: "Kazzak", id: 1305, slug: "kazzak" },
  guild: {
    key: link,
    name: "Pug Life",
    id: 42,
    realm: { key: link, name: "Kazzak", id: 1305, slug: "kazzak" },
    faction: { type: "HORDE", name: "Horde" },
  },
  level: 80,
  experience: 0,
  achievement_points: 12345,
  last_login_timestamp: 1750000000000,
  average_item_level: 680,
  equipped_item_level: 678,
  is_remix: false,
  name_search: "pugsley",
  achievements: link,
  titles: link,
  pvp_summary: link,
  encounters: link,
  media: link,
  specializations: link,
  statistics: link,
  mythic_keystone_profile: link,
  equipment: link,
  appearance: link,
  collections: link,
  reputations: link,
  quests: link,
  achievements_statistics: link,
  professions: link,
};

describe("mapBlizzardCharacter", () => {
  it("maps a profile with a guild", () => {
    const avatarUrl = "https://render.worldofwarcraft.com/avatar.jpg";

    expect(mapBlizzardCharacter(profile, avatarUrl)).toEqual({
      class: "Shaman",
      race: "Orc",
      activeSpec: "Enhancement",
      faction: "Horde",
      gender: "Male",
      level: 80,
      equippedItemLevel: 678,
      averageItemLevel: 680,
      achievementPoints: 12345,
      guild: { name: "Pug Life", realm: "Kazzak" },
      avatarUrl,
    });
  });

  it("maps a guildless profile with no avatar", () => {
    const { guild: _guild, ...guildless } = profile;
    const result = mapBlizzardCharacter(guildless as BlizzardCharacterProfile, null);

    expect(result.guild).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});
