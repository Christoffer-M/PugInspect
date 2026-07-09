import type { BlizzardKeyedEntity, BlizzardLink, BlizzardTypedValue } from "./CharacterProfile.js";

// ---------------------------------------------------------------------------
// Equipment endpoint — /profile/wow/character/{realm}/{name}/equipment
// Only the fields we consume are modeled; the raw response carries much more.
// ---------------------------------------------------------------------------

export interface BlizzardItemEnchantment {
  display_string: string;
  enchantment_id?: number;
  /** Absent on some (older) payloads — treat as PERMANENT when missing. */
  enchantment_slot?: { id: number; type: string };
}

export interface BlizzardItemSocket {
  socket_type: BlizzardTypedValue;
  /** The socketed gem. Absent = empty socket. */
  item?: BlizzardKeyedEntity;
  display_string?: string;
}

export interface BlizzardItemSet {
  item_set: { key: BlizzardLink; name: string; id: number };
  items: { item: BlizzardKeyedEntity; is_equipped?: boolean }[];
  effects?: { display_string: string; required_count: number; is_active?: boolean }[];
  display_string?: string;
}

export interface BlizzardEquippedItem {
  item: { key: BlizzardLink; id: number };
  slot: BlizzardTypedValue;
  name: string;
  quality: BlizzardTypedValue;
  level: { value: number; display_string?: string };
  media: { key: BlizzardLink; id: number };
  item_class?: BlizzardKeyedEntity;
  item_subclass?: BlizzardKeyedEntity;
  inventory_type?: BlizzardTypedValue;
  enchantments?: BlizzardItemEnchantment[];
  sockets?: BlizzardItemSocket[];
  set?: BlizzardItemSet;
  /**
   * NOT part of the Blizzard response — enriched by BlizzardService from the
   * item-media endpoint before persisting, so cached snapshots need no media calls.
   */
  iconUrl?: string | null;
}

export interface BlizzardCharacterEquipment {
  _links: { self: BlizzardLink };
  equipped_items: BlizzardEquippedItem[];
}

export interface BlizzardItemMedia {
  assets: { key: string; value: string }[];
}
