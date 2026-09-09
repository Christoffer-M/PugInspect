import { describe, expect, it } from "vitest";
import {
  RosterCoreDocument,
  RosterLogsDocument,
  RosterRioDocument,
} from "../graphql/graphql";

/**
 * The roster page fetches identity, RIO and parses as three documents because
 * the backend spends upstream quota per selection set, and its roster lookup
 * awaits RaiderIO before it starts the WarcraftLogs call. Fold a field back
 * into the wrong document and parses silently queue behind RIO again - which
 * is invisible until someone times the page.
 */
describe("roster query split", () => {
  const core = String(RosterCoreDocument);
  const rio = String(RosterRioDocument);
  const logs = String(RosterLogsDocument);

  it("keeps each upstream in its own document", () => {
    expect(core).not.toMatch(/raiderIo|raidLogs/);
    expect(rio).toMatch(/raiderIo/);
    expect(rio).not.toMatch(/raidLogs/);
    expect(logs).toMatch(/raidLogs/);
    expect(logs).not.toMatch(/raiderIo/);
  });

  it("asks for identity fields only in the core document", () => {
    // The cards read these off every entry, so they must ride the first
    // response rather than waiting on a slower upstream.
    for (const field of ["class", "activeSpec", "equippedItemLevel", "role"]) {
      expect(core).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it("scopes difficulty to the parses document only", () => {
    // Difficulty-keyed documents refetch on every toggle; identity and RIO
    // progression are difficulty-agnostic (progFor derives all three from one
    // raidProgression payload), so keeping them unscoped is the whole win.
    expect(logs).toMatch(/\$difficulty/);
    expect(core).not.toMatch(/\$difficulty|\$zoneId/);
    expect(rio).not.toMatch(/\$difficulty|\$zoneId/);
  });
});
