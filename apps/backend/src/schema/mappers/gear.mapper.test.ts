import { describe, it, expect } from "vitest";
import { mapGear } from "./gear.mapper.js";
import type {
  BlizzardCharacterEquipment,
  BlizzardEquippedItem,
} from "../services/blizzard/model/CharacterEquipment.js";

const link = { href: "https://eu.api.blizzard.com/stub" };
const keyed = (name: string, id: number) => ({ key: link, name, id });

function item(overrides: Partial<BlizzardEquippedItem> & { slot: { type: string; name: string } }): BlizzardEquippedItem {
  return {
    item: { key: link, id: 1000 },
    name: "Test Item",
    quality: { type: "EPIC", name: "Epic" },
    level: { value: 678 },
    media: { key: link, id: 1000 },
    ...overrides,
  };
}

const permanentEnchant = {
  display_string: "Enchanted: Chant of Winged Grace",
  enchantment_id: 7418,
  enchantment_slot: { id: 0, type: "PERMANENT" },
};

const temporaryEnchant = {
  display_string: "Ironclaw Whetstone (1 hour)",
  enchantment_id: 7495,
  enchantment_slot: { id: 1, type: "TEMPORARY" },
};

function equipment(items: BlizzardEquippedItem[]): BlizzardCharacterEquipment {
  return { _links: { self: link }, equipped_items: items };
}

describe("mapGear", () => {
  it("maps basic item fields", () => {
    const gear = mapGear(
      equipment([
        item({
          slot: { type: "WAIST", name: "Waist" },
          name: "Belt of Testing",
          quality: { type: "RARE", name: "Rare" },
          level: { value: 665 },
          iconUrl: "https://render.worldofwarcraft.com/icons/56/inv_belt.jpg",
        }),
      ])
    );

    expect(gear.items).toHaveLength(1);
    expect(gear.items[0]).toMatchObject({
      slot: "WAIST",
      slotName: "Waist",
      name: "Belt of Testing",
      quality: "RARE",
      itemLevel: 665,
      iconUrl: "https://render.worldofwarcraft.com/icons/56/inv_belt.jpg",
      enchant: null,
      missingEnchant: false, // waist is not enchantable
      sockets: [],
      tierSetId: null,
      tierSetName: null,
    });
  });

  it("flags a missing enchant on an enchantable slot and exposes enchant text when present", () => {
    const gear = mapGear(
      equipment([
        item({ slot: { type: "CHEST", name: "Chest" } }),
        item({ slot: { type: "HEAD", name: "Head" } }),
        item({ slot: { type: "BACK", name: "Back" } }), // cloak enchants removed in Midnight
        item({ slot: { type: "FEET", name: "Feet" }, enchantments: [permanentEnchant] }),
      ])
    );

    const bySlot = Object.fromEntries(gear.items.map((i) => [i.slot, i]));
    expect(bySlot.CHEST!.missingEnchant).toBe(true);
    expect(bySlot.CHEST!.enchant).toBeNull();
    expect(bySlot.HEAD!.missingEnchant).toBe(true);
    expect(bySlot.BACK!.missingEnchant).toBe(false);
    expect(bySlot.FEET!.missingEnchant).toBe(false);
    expect(bySlot.FEET!.enchant).toBe("Enchanted: Chant of Winged Grace");
  });

  it("strips in-game UI atlas tags from enchant display strings", () => {
    const gear = mapGear(
      equipment([
        item({
          slot: { type: "HEAD", name: "Head" },
          enchantments: [
            {
              display_string:
                "Enchanted: Enchant Helm - Empowered Hex of Leeching |A:Professions-ChatIcon-Quality-12-Tier2:20:20|a",
              enchantment_slot: { id: 0, type: "PERMANENT" },
            },
          ],
        }),
      ])
    );

    expect(gear.items[0]!.enchant).toBe("Enchanted: Enchant Helm - Empowered Hex of Leeching");
  });

  it("does not count temporary enchants (oils/stones) as permanent", () => {
    const gear = mapGear(
      equipment([
        item({ slot: { type: "MAIN_HAND", name: "Main Hand" }, enchantments: [temporaryEnchant] }),
      ])
    );

    expect(gear.items[0]!.missingEnchant).toBe(true);
    expect(gear.items[0]!.enchant).toBeNull();
  });

  it("treats an enchantment without enchantment_slot as permanent (older payloads)", () => {
    const gear = mapGear(
      equipment([
        item({
          slot: { type: "LEGS", name: "Legs" },
          enchantments: [{ display_string: "Enchanted: Stormbound Armor Kit" }],
        }),
      ])
    );

    expect(gear.items[0]!.missingEnchant).toBe(false);
    expect(gear.items[0]!.enchant).toBe("Enchanted: Stormbound Armor Kit");
  });

  it("only flags off-hands that are weapons", () => {
    const gear = mapGear(
      equipment([
        item({
          slot: { type: "OFF_HAND", name: "Off Hand" },
          item_class: keyed("Armor", 4), // shield
        }),
        item({
          slot: { type: "MAIN_HAND", name: "Main Hand" },
          item_class: keyed("Weapon", 2),
        }),
      ])
    );

    const offHand = gear.items.find((i) => i.slot === "OFF_HAND")!;
    const mainHand = gear.items.find((i) => i.slot === "MAIN_HAND")!;
    expect(offHand.missingEnchant).toBe(false);
    expect(mainHand.missingEnchant).toBe(true);

    const weaponOffHand = mapGear(
      equipment([
        item({ slot: { type: "OFF_HAND", name: "Off Hand" }, item_class: keyed("Weapon", 2) }),
      ])
    );
    expect(weaponOffHand.items[0]!.missingEnchant).toBe(true);
  });

  it("maps filled and empty sockets", () => {
    const gear = mapGear(
      equipment([
        item({
          slot: { type: "WRIST", name: "Wrist" },
          sockets: [
            { socket_type: { type: "PRISMATIC", name: "Prismatic Socket" }, item: keyed("Culminating Blasphemite", 213746), display_string: "+176 Haste" },
            { socket_type: { type: "PRISMATIC", name: "Prismatic Socket" } },
          ],
        }),
      ])
    );

    expect(gear.items[0]!.sockets).toEqual([
      { filled: true, display: "+176 Haste" },
      { filled: false, display: null },
    ]);
  });

  it("drops shirt, tabard, and unknown slots; sorts by paperdoll order", () => {
    const gear = mapGear(
      equipment([
        item({ slot: { type: "TABARD", name: "Tabard" } }),
        item({ slot: { type: "MAIN_HAND", name: "Main Hand" } }),
        item({ slot: { type: "SHIRT", name: "Shirt" } }),
        item({ slot: { type: "HEAD", name: "Head" } }),
        item({ slot: { type: "PROFESSION_TOOL_1", name: "Profession Tool" } }),
        item({ slot: { type: "CHEST", name: "Chest" } }),
      ])
    );

    expect(gear.items.map((i) => i.slot)).toEqual(["HEAD", "CHEST", "MAIN_HAND"]);
  });

  it("summarizes tier sets, counting only equipped pieces and deduping across items", () => {
    const set = {
      item_set: { key: link, name: "Cauldron Champion's Encore", id: 1867 },
      items: [
        { item: keyed("Tier Helm", 1), is_equipped: true },
        { item: keyed("Tier Shoulders", 2), is_equipped: true },
        { item: keyed("Tier Chest", 3) },
        { item: keyed("Tier Legs", 4) },
        { item: keyed("Tier Hands", 5) },
      ],
    };
    const gear = mapGear(
      equipment([
        item({ slot: { type: "HEAD", name: "Head" }, set }),
        item({ slot: { type: "SHOULDER", name: "Shoulder" }, set }),
        item({ slot: { type: "WAIST", name: "Waist" } }),
      ])
    );

    expect(gear.tierSets).toEqual([
      { id: 1867, name: "Cauldron Champion's Encore", equippedCount: 2 },
    ]);
    expect(gear.items.find((i) => i.slot === "HEAD")!.tierSetName).toBe("Cauldron Champion's Encore");
    expect(gear.items.find((i) => i.slot === "WAIST")!.tierSetId).toBeNull();
  });

  it("handles a naked character", () => {
    const gear = mapGear(equipment([]));
    expect(gear.items).toEqual([]);
    expect(gear.tierSets).toEqual([]);
  });
});
