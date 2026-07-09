import type { BlizzardCharacterEquipment, BlizzardEquippedItem } from "../services/blizzard/model/CharacterEquipment.js";
import type { Gear, GearItem, TierSetSummary } from "@repo/graphql-types";

// ---------------------------------------------------------------------------
// Per-season config — update at season/expansion boundaries.
// ---------------------------------------------------------------------------

// Canonical display order; doubles as the allowlist — anything not listed
// (SHIRT, TABARD, profession tool/accessory slots) is dropped.
const SLOT_ORDER = [
  "HEAD", "NECK", "SHOULDER", "BACK", "CHEST", "WRIST", "HANDS", "WAIST",
  "LEGS", "FEET", "FINGER_1", "FINGER_2", "TRINKET_1", "TRINKET_2",
  "MAIN_HAND", "OFF_HAND",
];

// SEASON-CONFIG: enchantable slots — verify against a well-geared character
// each season (see docs/SEASONAL_UPDATES.md).
// Slots expected to carry a PERMANENT enchant this season (Midnight era:
// helm/shoulder enchants returned, cloak/bracer enchants removed; legs are
// covered by profession armor kits which the API reports as enchantments).
// OFF_HAND is special-cased below — only enchantable when the equipped item
// is a weapon (no shield/held-in-off-hand enchants).
const ENCHANTABLE_SLOTS = new Set([
  "HEAD", "SHOULDER", "CHEST", "LEGS", "FEET", "FINGER_1", "FINGER_2", "MAIN_HAND",
]);

// Blizzard embeds in-game UI atlas tags in display strings (e.g. the crafting
// quality icon "|A:Professions-ChatIcon-Quality-12-Tier2:20:20|a") — strip for web.
function stripUiTags(s: string): string {
  return s.replace(/\s*\|A:[^|]*\|a/g, "").trim();
}

// Older payloads may omit enchantment_slot — treat those as permanent so we
// don't warn on enchants we can't classify. Temporary enchants (oils, stones)
// must not count.
function findPermanentEnchant(item: BlizzardEquippedItem) {
  return (item.enchantments ?? []).find(
    (e) => !e.enchantment_slot || e.enchantment_slot.type === "PERMANENT"
  );
}

function isEnchantable(item: BlizzardEquippedItem): boolean {
  return (
    ENCHANTABLE_SLOTS.has(item.slot.type) ||
    (item.slot.type === "OFF_HAND" && item.item_class?.name === "Weapon")
  );
}

export function mapGear(equipment: BlizzardCharacterEquipment): Gear {
  const items: GearItem[] = equipment.equipped_items
    .filter((it) => SLOT_ORDER.includes(it.slot.type))
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot.type) - SLOT_ORDER.indexOf(b.slot.type))
    .map((it) => {
      const permanentEnchant = findPermanentEnchant(it);

      return {
        slot: it.slot.type,
        slotName: it.slot.name,
        itemId: it.item.id,
        name: it.name,
        quality: it.quality.type,
        itemLevel: it.level.value,
        iconUrl: it.iconUrl ?? null,
        enchant: permanentEnchant ? stripUiTags(permanentEnchant.display_string) : null,
        missingEnchant: isEnchantable(it) && !permanentEnchant,
        sockets: (it.sockets ?? []).map((s) => {
          const display = s.display_string ?? s.item?.name ?? null;
          return { filled: !!s.item, display: display ? stripUiTags(display) : null };
        }),
        tierSetId: it.set?.item_set.id ?? null,
        tierSetName: it.set?.item_set.name ?? null,
      };
    });

  // Blizzard repeats the full set block on every tier piece — dedupe by set id.
  const tierSets = new Map<number, TierSetSummary>();
  for (const it of equipment.equipped_items) {
    if (!it.set || tierSets.has(it.set.item_set.id)) continue;
    tierSets.set(it.set.item_set.id, {
      id: it.set.item_set.id,
      name: it.set.item_set.name,
      equippedCount: it.set.items.filter((x) => x.is_equipped).length,
    });
  }

  return { items, tierSets: [...tierSets.values()] };
}
