import { describe, expect, it } from "vitest";
import { wowheadData } from "./GearItemTile";
import type { CharacterGearItem } from "../../queries/character-gear";

const item = (over: Partial<CharacterGearItem>): CharacterGearItem =>
  ({
    slot: "NECK",
    itemId: 195480,
    name: "Test",
    quality: "EPIC",
    itemLevel: 292,
    iconUrl: null,
    enchantId: null,
    bonusIds: [],
    missingEnchant: false,
    sockets: [],
    tierSetId: null,
    ...over,
  }) as CharacterGearItem;

describe("wowheadData", () => {
  it("sends 0 for an empty socket so gems keep their position", () => {
    const sockets = [
      { filled: false, itemId: null },
      { filled: true, itemId: 192919 },
    ];
    expect(wowheadData(item({ sockets }))).toContain("gems=0:192919");
  });

  it("omits trailing empty sockets — Wowhead trims them anyway", () => {
    const sockets = [
      { filled: true, itemId: 192919 },
      { filled: false, itemId: null },
    ];
    expect(wowheadData(item({ sockets }))).toContain("gems=192919");
  });

  it("drops the param entirely when nothing is socketed", () => {
    const sockets = [{ filled: false, itemId: null }];
    expect(wowheadData(item({ sockets }))).not.toContain("gems=");
  });
});
