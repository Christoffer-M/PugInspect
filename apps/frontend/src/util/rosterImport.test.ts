import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { decodeRosterImport } from "./rosterImport";

// Mirror of the addon's LibDeflate CompressDeflate + EncodeForPrint pipeline,
// so these tests pin both sides of the export-string contract.
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()";
function encodeExportString(payload: string): string {
  const compressed = deflateRawSync(Buffer.from(payload, "utf8"));
  let out = "!PI1!";
  let cache = 0;
  let bits = 0;
  for (const byte of compressed) {
    cache |= byte << bits;
    bits += 8;
    while (bits >= 6) {
      out += ALPHABET[cache & 63];
      cache >>= 6;
      bits -= 6;
    }
  }
  if (bits > 0) out += ALPHABET[cache & 63];
  return out;
}

describe("decodeRosterImport", () => {
  it("decodes a full export string with class/role hints and realm slugging", async () => {
    const encoded = encodeExportString(
      "eu;Ceasetank-TarrenMill:WARRIOR:T;Lightwell-Kazzak:PRIEST:H;Ceases-Kazzak:MAGE:D;Nohints-Area52"
    );

    const result = await decodeRosterImport(encoded);

    expect(result).toEqual({
      region: "eu",
      characters: [
        { name: "Ceasetank", realm: "tarren-mill", classFile: "WARRIOR", role: "TANK" },
        { name: "Lightwell", realm: "kazzak", classFile: "PRIEST", role: "HEALER" },
        { name: "Ceases", realm: "kazzak", classFile: "MAGE", role: "DPS" },
        { name: "Nohints", realm: "area-52", classFile: undefined, role: undefined },
      ],
    });
  });

  it("handles Cyrillic names and maps Russian realms to their transliterated slugs", async () => {
    const encoded = encodeExportString(
      "eu;Пуговка-Гордунни:MAGE:D;Тест-РевущийФьорд:DRUID:H;Лич-Король-лич:PRIEST:H"
    );

    const result = await decodeRosterImport(encoded);

    expect(result?.characters).toEqual([
      { name: "Пуговка", realm: "gordunni", classFile: "MAGE", role: "DPS" },
      { name: "Тест", realm: "howling-fjord", classFile: "DRUID", role: "HEALER" },
      // Realm itself contains a dash — first-dash split keeps it intact.
      { name: "Лич", realm: "lich-king", classFile: "PRIEST", role: "HEALER" },
    ]);
  });

  it("dedupes repeated characters and survives surrounding whitespace", async () => {
    const encoded = encodeExportString("eu;Pug-Kazzak:MAGE:D;Pug-Kazzak:MAGE:D");
    const result = await decodeRosterImport(`  ${encoded}\n`);
    expect(result?.characters).toHaveLength(1);
  });

  it("returns null for non-export text, bad regions, and corrupted strings", async () => {
    expect(await decodeRosterImport("Ceasetank-Kazzak\nLightwell-Kazzak")).toBeNull();
    expect(await decodeRosterImport(encodeExportString("xx;Pug-Kazzak:MAGE:D"))).toBeNull();
    const valid = encodeExportString("eu;Pug-Kazzak:MAGE:D");
    expect(await decodeRosterImport(valid.slice(0, -4))).toBeNull();
    expect(await decodeRosterImport("!PI1!")).toBeNull();
  });
});
