// Browser-only stand-in for the Tauri runtime so `pnpm dev` can render every screen
// without the native shell. Pick a scenario with the URL hash: #waiting (default),
// #synced, #new, #lost. Never bundled: main.tsx imports it only in dev outside Tauri.
import type { Frame } from "./state";

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
      case "plugin:app|version":
        return "0.1.0-dev";
      case "plugin:opener|open_url":
        window.open(args.url, "_blank");
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
  { name: "Frostvyre", realm: "Kazzak", class: "MAGE", role: "D", ilvl: 302, rio: 3112 },
  { name: "Bearlyalive", realm: "Ravencrest", class: "DRUID", role: "T", ilvl: 299, rio: 2884 },
  { name: "Lightwarden", realm: "Silvermoon", class: "PRIEST", role: "H", ilvl: 297, rio: 2705 },
  { name: "Soulrend", realm: "Kazzak", class: "WARLOCK", role: "D", ilvl: 295, rio: 2611 },
  { name: "Emberhoof", realm: "TarrenMill", class: "PALADIN", role: "D", ilvl: 293, rio: 2450 },
  { name: "Quickshot", realm: "TwistingNether", class: "HUNTER", role: "D", ilvl: 288, rio: 2201 },
  { name: "Bloodhilt", realm: "Draenor", class: "DEATHKNIGHT", role: "T", ilvl: 284, rio: 1840 },
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
            raidProgression: [{ raid: "manaforge-omega", total_bosses: 8, normal_bosses_killed: 8, heroic_bosses_killed: [8, 6, 8, 4, 6, 0, 0][i], mythic_bosses_killed: 0 }],
          },
          raidLogs: { bestPerformanceAverage: [96, 78, 61, 44, 33, 19, 8][i], medianPerformanceAverage: 50 },
        },
      };
    });
  return new Response(JSON.stringify({ data: { rosterCharacters } }), { headers: { "Content-Type": "application/json" } });
};

const frame = (over: Partial<Frame>): Frame => ({
  hb: 1, region: "eu", realm: "Kazzak", sessionId: 1725300000, activityId: 1, title: "Manaforge Omega HC · fresh run", total: 7, applicants: APPLICANTS, ...over,
});
const data = (over: Partial<Frame>) => emit("sync", { kind: "data", ...frame(over) });

setTimeout(() => {
  switch (location.hash) {
    case "#synced":
      data({});
      break;
    case "#new":
      data({});
      setTimeout(() => data({ sessionId: 1725300999, title: "Ara-Kara +12 · need heals", total: 0, applicants: [] }), 1200);
      break;
    case "#lost":
      data({});
      setTimeout(() => emit("sync", { kind: "status", status: "lost" }), 1200);
      break;
    default:
      emit("sync", { kind: "status", status: "no_window" });
  }
}, 300);
