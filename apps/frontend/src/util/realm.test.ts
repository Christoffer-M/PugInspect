import { slugRealm } from "@repo/ui";
import { describe, expect, it } from "vitest";

/** The addon sends WoW's client-normalized realm: the name in the player's
 *  locale with separators stripped. These are the forms that actually arrive. */
describe("slugRealm", () => {
  it("keeps lowercase words that a case-boundary guess would swallow", () => {
    // Regression: "DerRatvonDalaran" guessed to "der-ratvon-dalaran", which
    // Blizzard 404s while RaiderIO tolerates it — a half-populated character
    // page rather than a visible error. Seen in production 2026-09-12.
    expect(slugRealm("DerRatvonDalaran", "eu")).toBe("der-rat-von-dalaran");
    expect(slugRealm("KultderVerdammten", "eu")).toBe("kult-der-verdammten");
    expect(slugRealm("ZirkeldesCenarius", "eu")).toBe("zirkel-des-cenarius");
    expect(slugRealm("ChamberofAspects", "eu")).toBe("chamber-of-aspects");
    expect(slugRealm("SistersofElune", "us")).toBe("sisters-of-elune");
  });

  it("resolves a name that means different realms in different regions", () => {
    // Spirestone is a realm of its own in US/TW and the en_US name of EU's
    // Colinas Pardas; without the region one of them gets the other's slug.
    expect(slugRealm("Spirestone", "us")).toBe("spirestone");
    expect(slugRealm("Spirestone", "eu")).toBe("colinas-pardas");
  });

  it("handles apostrophes, transliterated names, and plain multi-word realms", () => {
    expect(slugRealm("MalGanis", "us")).toBe("malganis"); // not "mal-ganis"
    expect(slugRealm("РевущийФьорд", "eu")).toBe("howling-fjord");
    expect(slugRealm("TarrenMill", "eu")).toBe("tarren-mill");
    expect(slugRealm("Aggra (Português)", "eu")).toBe("aggra-português");
  });

  it("accepts every spelling variant the clients send for one realm", () => {
    for (const variant of ["Der Rat von Dalaran", "DerRatvonDalaran", "der-rat-von-dalaran"])
      expect(slugRealm(variant, "eu")).toBe("der-rat-von-dalaran");
  });

  it("is case-insensitive about the region", () => {
    expect(slugRealm("TarrenMill", "EU")).toBe("tarren-mill");
  });

  it("falls back to the case-boundary guess for realms not in the table", () => {
    // A realm opened since the last `pnpm season:update`: still better than
    // nothing, and correct whenever every word is capitalized.
    expect(slugRealm("BrandNewRealm", "eu")).toBe("brand-new-realm");
  });
});
