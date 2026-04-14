export interface BlizzardLink {
  href: string;
}

export interface BlizzardKeyedEntity {
  key: BlizzardLink;
  name: string;
  id: number;
}

export interface BlizzardTypedValue {
  type: string;
  name: string;
}

export interface BlizzardRealm {
  key: BlizzardLink;
  name: string;
  id: number;
  slug: string;
}

export interface BlizzardGuild {
  key: BlizzardLink;
  name: string;
  id: number;
  realm: BlizzardRealm;
  faction: BlizzardTypedValue;
}

export interface BlizzardCharacterMediaAsset {
  key: string;
  value: string;
}

export interface BlizzardCharacterMedia {
  _links: { self: BlizzardLink };
  assets: BlizzardCharacterMediaAsset[];
}

export interface BlizzardCharacterProfile {
  _links: {
    self: BlizzardLink;
  };
  id: number;
  name: string;
  gender: BlizzardTypedValue;
  faction: BlizzardTypedValue;
  race: BlizzardKeyedEntity;
  character_class: BlizzardKeyedEntity;
  active_spec: BlizzardKeyedEntity;
  realm: BlizzardRealm;
  guild?: BlizzardGuild;
  level: number;
  experience: number;
  achievement_points: number;
  last_login_timestamp: number;
  average_item_level: number;
  equipped_item_level: number;
  is_remix: boolean;
  name_search: string;
  // Sub-resource link fields (href-only references to further endpoints)
  achievements: BlizzardLink;
  titles: BlizzardLink;
  pvp_summary: BlizzardLink;
  encounters: BlizzardLink;
  media: BlizzardLink;
  specializations: BlizzardLink;
  statistics: BlizzardLink;
  mythic_keystone_profile: BlizzardLink;
  equipment: BlizzardLink;
  appearance: BlizzardLink;
  collections: BlizzardLink;
  reputations: BlizzardLink;
  quests: BlizzardLink;
  achievements_statistics: BlizzardLink;
  professions: BlizzardLink;
}
