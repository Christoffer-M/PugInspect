// Browser-only stand-in for the Tauri runtime so `pnpm dev` can render every screen
// without the native shell. Pick a scenario with the URL hash: #waiting (default),
// #synced, #new, #lost, #update, #update-fail. Never bundled: main.tsx imports it only in dev outside Tauri.
import type { Frame } from "./state";
import { DEFAULT_RAID } from "./generated/seasonConfig";

type Cb = (e: { event: string; id: number; payload: unknown }) => void;
const callbacks = new Map<number, Cb>();
const listeners = new Map<string, Set<number>>();
let nextId = 1;

const emit = (event: string, payload: unknown) =>
  listeners.get(event)?.forEach((id) => callbacks.get(id)?.({ event, id, payload }));

(window as unknown as { __TAURI_EVENT_PLUGIN_INTERNALS__: unknown }).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
  unregisterListener: (event: string, id: number) => listeners.get(event)?.delete(id),
};
(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
  metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } },
  transformCallback(cb: Cb) {
    const id = nextId++;
    callbacks.set(id, cb);
    return id;
  },
  async invoke(cmd: string, args: { event?: string; handler?: number; eventId?: number; url?: string } = {}) {
    switch (cmd) {
      case "plugin:event|listen": {
        const set = listeners.get(args.event!) ?? new Set();
        set.add(args.handler!);
        listeners.set(args.event!, set);
        return args.handler;
      }
      case "plugin:event|unlisten":
        listeners.get(args.event!)?.delete(args.eventId!);
        return;
      case "sync_snapshot":
        return { status: "", frame: null };
      case "plugin:app|version":
        return "0.1.0-dev";
      case "plugin:opener|open_url":
        window.open(args.url, "_blank");
        return;
      case "plugin:updater|check":
        return location.hash.startsWith("#update") ? { rid: 1, currentVersion: "0.1.0-dev", version: "9.9.9" } : null;
      case "plugin:updater|download_and_install":
        return new Promise((resolve, reject) =>
          setTimeout(location.hash === "#update-fail" ? () => reject("failed to download update: connection reset by peer (mock)") : resolve, 1500),
        );
      case "plugin:resources|close":
        return;
      case "plugin:notification|is_permission_granted":
        return false;
      case "plugin:notification|request_permission":
        return "denied";
      default:
        return; // window / autostart calls: no-ops in the browser
    }
  },
};

const APPLICANTS: Frame["applicants"] = [
  { name: "Frostvyre", realm: "Kazzak", class: "MAGE", role: "D", ilvl: 302, rio: 0, group: 1, bestLevel: 0, bestTimed: false },
  { name: "Bearlyalive", realm: "Ravencrest", class: "DRUID", role: "T", ilvl: 299, rio: 2884, group: 2, bestLevel: 0, bestTimed: false },
  { name: "Lightwarden", realm: "Silvermoon", class: "PRIEST", role: "H", ilvl: 297, rio: 2705, group: 2, bestLevel: 0, bestTimed: false },
  { name: "Soulrend", realm: "Kazzak", class: "WARLOCK", role: "D", ilvl: 295, rio: 2611, group: 2, bestLevel: 0, bestTimed: false },
  { name: "Emberhoof", realm: "TarrenMill", class: "PALADIN", role: "D", ilvl: 293, rio: 2450, group: 3, bestLevel: 0, bestTimed: false },
  { name: "Quickshot", realm: "TwistingNether", class: "HUNTER", role: "D", ilvl: 288, rio: 2201, group: 4, bestLevel: 0, bestTimed: false },
  { name: "Bloodhilt", realm: "Draenor", class: "DEATHKNIGHT", role: "T", ilvl: 284, rio: 1840, group: 5, bestLevel: 0, bestTimed: false },
];

const SPECS: Record<string, string> = { MAGE: "Fire", DRUID: "Guardian", PRIEST: "Holy", WARLOCK: "Destruction", PALADIN: "Retribution", HUNTER: "Beast Mastery", DEATHKNIGHT: "Blood" };
const CLASS: Record<string, string> = { MAGE: "Mage", DRUID: "Druid", PRIEST: "Priest", WARLOCK: "Warlock", PALADIN: "Paladin", HUNTER: "Hunter", DEATHKNIGHT: "Death Knight" };

// Fake the backend lookup: two applicants stay "looking up…" forever, like the design.
const realFetch = window.fetch;
window.fetch = async (input, init) => {
  const body = typeof init?.body === "string" ? init.body : "";
  if (!body.includes("RosterCharacters")) return realFetch(input, init);
  const { characters } = JSON.parse(body).variables as { characters: { name: string; realm: string }[] };
  await new Promise((r) => setTimeout(r, 900));
  const rosterCharacters = characters
    .filter((c) => !["frostvyre", "quickshot"].includes(c.name.toLowerCase()))
    .map((c) => {
      const a = APPLICANTS.find((x) => x.name.toLowerCase() === c.name.toLowerCase())!;
      const i = APPLICANTS.indexOf(a);
      return {
        name: c.name,
        realm: c.realm,
        notFound: false,
        role: null,
        character: {
          class: CLASS[a.class],
          activeSpec: SPECS[a.class],
          equippedItemLevel: a.ilvl,
          raiderIo: {
            currentSeason: { all: { score: a.rio, color: ["#e6cc80", "#a335ee", "#a335ee", "#a335ee", "#0070dd", "#0070dd", "#1eff00"][i] } },
            raidProgression: [{ raid: "some-world-boss", total_bosses: 1, normal_bosses_killed: 1, heroic_bosses_killed: 1, mythic_bosses_killed: 0 }, { raid: DEFAULT_RAID, total_bosses: 8, normal_bosses_killed: 8, heroic_bosses_killed: [8, 6, 8, 4, 6, 0, 0][i], mythic_bosses_killed: 0 }],
          },
          raidLogs: { bestPerformanceAverage: [96, 78, 61, 44, 33, 19, 8][i], medianPerformanceAverage: 50 },
          mythicPlusLogs: { bestPerformanceAverage: [88, 70, 55, 40, 30, 15, 5][i] },
        },
      };
    });
  return new Response(JSON.stringify({ data: { rosterCharacters } }), { headers: { "Content-Type": "application/json" } });
};

const frame = (over: Partial<Frame>): Frame => ({
  hb: 1, region: "eu", realm: "Kazzak", sessionId: 1725300000, activityId: 1, title: "Manaforge Omega HC · fresh run", total: 7, difficulty: "H", applicants: APPLICANTS, ...over,
});
const data = (over: Partial<Frame>) => emit("sync", { kind: "data", ...frame(over) });

setTimeout(() => {
  switch (location.hash) {
    case "#synced":
      data({});
      break;
    case "#new":
      data({});
      setTimeout(() => data({ sessionId: 1725300999, title: "Ara-Kara +12 · need heals", total: 0, difficulty: "+", applicants: [] }), 1200);
      break;
    case "#keys":
      data({
        title: "Ara-Kara, City of Echoes (Mythic Keystone)",
        difficulty: "+",
        applicants: APPLICANTS.map((a, i) => ({ ...a, bestLevel: [12, 11, 0, 14, 10, 9, 13][i]!, bestTimed: i % 2 === 0 })),
      });
      break;
    case "#outdated":
      emit("sync", { kind: "status", status: "addon_outdated" });
      break;
    case "#overflow":
      data({ total: 23 });
      break;
    case "#update":
    case "#update-fail":
      data({});
      break;
    case "#lost":
      data({});
      setTimeout(() => emit("sync", { kind: "status", status: "lost" }), 1200);
      break;
    default:
      emit("sync", { kind: "status", status: "no_window" });
  }
}, 300);
