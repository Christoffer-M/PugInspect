import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { decodeRosterImport, parseNameRealm } from "./rosterImport";

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
  it("decodes a full export string with class/role hints, realms as written", async () => {
    const encoded = encodeExportString(
      "eu;Ceasetank-TarrenMill:WARRIOR:T;Lightwell-Kazzak:PRIEST:H;Ceases-Kazzak:MAGE:D;Nohints-Area52"
    );

    const result = await decodeRosterImport(encoded);

    expect(result).toEqual({
      region: "eu",
      characters: [
        { name: "Ceasetank", realm: "TarrenMill", classFile: "WARRIOR", role: "TANK" },
        { name: "Lightwell", realm: "Kazzak", classFile: "PRIEST", role: "HEALER" },
        { name: "Ceases", realm: "Kazzak", classFile: "MAGE", role: "DPS" },
        { name: "Nohints", realm: "Area52", classFile: undefined, role: undefined },
      ],
    });
  });

  it("handles Cyrillic names and realms", async () => {
    const encoded = encodeExportString(
      "eu;Пуговка-Гордунни:MAGE:D;Тест-РевущийФьорд:DRUID:H;Лич-Король-лич:PRIEST:H"
    );

    const result = await decodeRosterImport(encoded);

    expect(result?.characters).toEqual([
      { name: "Пуговка", realm: "Гордунни", classFile: "MAGE", role: "DPS" },
      { name: "Тест", realm: "РевущийФьорд", classFile: "DRUID", role: "HEALER" },
      // Realm itself contains a dash - first-dash split keeps it intact.
      { name: "Лич", realm: "Король-лич", classFile: "PRIEST", role: "HEALER" },
    ]);
  });

  it("dedupes repeated characters, across realm spellings, and survives surrounding whitespace", async () => {
    const encoded = encodeExportString("eu;Pug-TarrenMill:MAGE:D;Pug-Tarren Mill:MAGE:D");
    const result = await decodeRosterImport(`  ${encoded}\n`);
    expect(result?.characters).toHaveLength(1);
  });

  it("parseNameRealm splits manual entry the same way as a paste", () => {
    expect(parseNameRealm(" Bob - Tarren Mill ")).toEqual({ name: "Bob", realm: "Tarren Mill" });
    expect(parseNameRealm("Bob-der-rat-von-dalaran")).toEqual({ name: "Bob", realm: "der-rat-von-dalaran" });
    expect(parseNameRealm("NoRealm")).toBeNull();
    expect(parseNameRealm("Bob-")).toBeNull();
  });

  it("returns null for non-export text, bad regions, and corrupted strings", async () => {
    expect(await decodeRosterImport("Ceasetank-Kazzak\nLightwell-Kazzak")).toBeNull();
    expect(await decodeRosterImport(encodeExportString("xx;Pug-Kazzak:MAGE:D"))).toBeNull();
    const valid = encodeExportString("eu;Pug-Kazzak:MAGE:D");
    expect(await decodeRosterImport(valid.slice(0, -4))).toBeNull();
    expect(await decodeRosterImport("!PI1!")).toBeNull();
  });
});
