import { describe, expect, it } from "vitest";
import { isKnownRealm, normalizeRealm, resolveRealm } from "./helpers.js";

/**
 * The backend is the boundary where a realm becomes canonical: whatever a
 * client sends, everything downstream — upstreams, the `characters` row, the
 * sitemap — sees Blizzard's own slug.
 */
describe("resolveRealm", () => {
  it("recovers the slug from the Blizzard-normalized form clients send", () => {
    // normalizeRealm alone turns these into 404s, which is how they ended up
    // in the sitemap as their own rows.
    expect(normalizeRealm("TarrenMill")).toBe("tarrenmill"); // the old behaviour
    expect(resolveRealm("TarrenMill", "eu")).toBe("tarren-mill");
    expect(resolveRealm("TwistingNether", "eu")).toBe("twisting-nether");
    expect(resolveRealm("Area52", "us")).toBe("area-52");
  });

  it("keeps lowercase words a case-boundary guess would swallow", () => {
    expect(resolveRealm("DerRatvonDalaran", "eu")).toBe("der-rat-von-dalaran");
    expect(resolveRealm("ChamberofAspects", "eu")).toBe("chamber-of-aspects");
    expect(resolveRealm("KultderVerdammten", "eu")).toBe("kult-der-verdammten");
  });

  it("resolves localized names, including transliterated Russian realms", () => {
    expect(resolveRealm("РевущийФьорд", "eu")).toBe("howling-fjord");
    expect(resolveRealm("Гордунни", "eu")).toBe("gordunni");
  });

  it("disambiguates a realm name that means different realms per region", () => {
    // Spirestone is a US/TW realm and also the ru_RU name of EU colinas-pardas.
    expect(resolveRealm("Spirestone", "us")).toBe("spirestone");
    expect(resolveRealm("Spirestone", "eu")).toBe("colinas-pardas");
  });

  it("is idempotent, so services re-normalizing downstream is harmless", () => {
    const once = resolveRealm("DerRatvonDalaran", "eu");
    expect(resolveRealm(once, "eu")).toBe(once);
    expect(normalizeRealm(once)).toBe(once);
  });

  it("passes unknown realms through rather than rejecting them", () => {
    // A realm opened since the last deploy still has to work.
    expect(resolveRealm("Brand New Realm", "eu")).toBe("brand-new-realm");
    expect(isKnownRealm("Brand New Realm", "eu")).toBe(false);
    expect(isKnownRealm("TarrenMill", "eu")).toBe(true);
  });

  it("does not leak a realm across regions", () => {
    // Tarren Mill is EU-only; asking US for it must not hand back the EU slug.
    expect(isKnownRealm("TarrenMill", "us")).toBe(false);
  });
});
