import { describe, expect, it } from "vitest";
import { parseBeat } from "./companion.js";

const valid = {
  installId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  version: "0.5.1",
  link: "ok",
  listing: "raid:H",
  region: "EU",
  applicants: 7,
  total: 12,
  lookups: 14,
  lookupErrors: 0,
  notFound: 1,
  updateFailures: 0,
  updatePending: null,
  settings: { sound: false, closeAction: "hide" },
};

describe("parseBeat", () => {
  it("accepts a well-formed beat and lowercases the region", () => {
    const beat = parseBeat(valid);
    expect(beat).not.toBeNull();
    expect(beat!.region).toBe("eu");
    expect(beat!.settings).toEqual({ sound: false, closeAction: "hide" });
  });

  it("accepts a beat with nothing listed", () => {
    expect(parseBeat({ ...valid, link: "no_window", listing: "", region: null })).not.toBeNull();
  });

  it("keeps a pending update version", () => {
    expect(parseBeat({ ...valid, updatePending: "0.6.0" })?.updatePending).toBe("0.6.0");
  });

  // Nothing pending is the common case, so a junk value must cost the field,
  // never the beat -- otherwise a client bug here blinds every other metric.
  it("drops an unparseable pending version rather than the whole beat", () => {
    const beat = parseBeat({ ...valid, updatePending: "latest" });
    expect(beat).not.toBeNull();
    expect(beat!.updatePending).toBeNull();
  });

  // The endpoint is public and unauthenticated, so every rejection below is the
  // difference between a bounded column and attacker-controlled storage.
  it.each([
    ["a non-object body", "not-an-object"],
    ["a non-UUID install id", { ...valid, installId: "../../etc/passwd" }],
    ["a junk version", { ...valid, version: "0.5.1; DROP TABLE" }],
    ["an unknown link state", { ...valid, link: "pwned" }],
    ["an unknown listing", { ...valid, listing: "raid:X" }],
    ["a negative counter", { ...valid, lookups: -1 }],
    ["a fractional counter", { ...valid, lookups: 1.5 }],
    ["an absurd counter", { ...valid, lookups: 10_000_000 }],
    ["a missing counter", { ...valid, notFound: undefined }],
    ["a missing update counter", { ...valid, updateFailures: undefined }],
    ["a negative update counter", { ...valid, updateFailures: -3 }],
    ["settings used as free storage", { ...valid, settings: { k: "x".repeat(64) } }],
    ["nested settings", { ...valid, settings: { nested: { a: 1 } } }],
    ["too many settings keys", { ...valid, settings: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, true])) }],
    ["an array for settings", { ...valid, settings: [] }],
  ])("rejects %s", (_label, body) => {
    expect(parseBeat(body)).toBeNull();
  });

  it("drops an unparseable region rather than the whole beat", () => {
    expect(parseBeat({ ...valid, region: "not-a-region" })?.region).toBeNull();
  });
});
