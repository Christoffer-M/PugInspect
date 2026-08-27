import type { BlizzardCharacterEquipment, BlizzardEquippedItem } from "../services/blizzard/model/CharacterEquipment.js";
import type { Gear, GearItem, TierSetSummary } from "@repo/graphql-types";
import { ENCHANTABLE_SLOTS } from "../../generated/seasonConfig.js";

// Canonical display order; doubles as the allowlist — anything not listed
// (SHIRT, TABARD, profession tool/accessory slots) is dropped.
const SLOT_ORDER = [
  "HEAD", "NECK", "SHOULDER", "BACK", "CHEST", "WRIST", "HANDS", "WAIST",
  "LEGS", "FEET", "FINGER_1", "FINGER_2", "TRINKET_1", "TRINKET_2",
  "MAIN_HAND", "OFF_HAND",
];

// Hand-maintained in scripts/season-config.mts.
// OFF_HAND is special-cased below — only enchantable when the equipped item
// is a weapon (no shield/held-in-off-hand enchants).
const enchantableSlots = new Set(ENCHANTABLE_SLOTS);

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
    enchantableSlots.has(item.slot.type) ||
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
        enchantId: permanentEnchant?.enchantment_id ?? null,
        bonusIds: it.bonus_list ?? [],
        missingEnchant: isEnchantable(it) && !permanentEnchant,
        sockets: (it.sockets ?? []).map((s) => {
          const display = s.display_string ?? s.item?.name ?? null;
          return {
            filled: !!s.item,
            display: display ? stripUiTags(display) : null,
            itemId: s.item?.id ?? null,
          };
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

  const counted = equipment.equipped_items.filter((it) => SLOT_ORDER.includes(it.slot.type));
  return { items, tierSets: [...tierSets.values()], equippedItemLevel: computeEquippedItemLevel(counted) };
}

// Two-handers (incl. ranged) fill both weapon slots in Blizzard's equipped-ilvl
// math; a 1H with an empty off-hand counts the off-hand as 0.
const TWO_HANDED_TYPES = new Set(["TWOHWEAPON", "RANGED", "RANGEDRIGHT"]);

/**
 * Blizzard's equipped item level: sum over the 16 gear slots / 16, with a
 * two-hand weapon counting for both weapon slots when the off-hand is empty.
 * Computed here from the same snapshot the item tiles render from, so the
 * header can never disagree with the items (the profile endpoint's
 * equipped_item_level lags gear changes by up to its 24h cache TTL).
 */
function computeEquippedItemLevel(items: BlizzardEquippedItem[]): number {
  let sum = 0;
  for (const it of items) sum += it.level.value;

  const mainHand = items.find((it) => it.slot.type === "MAIN_HAND");
  const hasOffHand = items.some((it) => it.slot.type === "OFF_HAND");
  if (mainHand && !hasOffHand && TWO_HANDED_TYPES.has(mainHand.inventory_type?.type ?? "")) {
    sum += mainHand.level.value;
  }

  return Math.floor(sum / SLOT_ORDER.length);
}
