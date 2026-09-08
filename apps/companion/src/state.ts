import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { slugRealm } from "@repo/ui";
import { CHUNK_SIZE, PARTS, lookupCharacters, type Part, type RosterEntry } from "./api";
import { count } from "./analytics";
import { MYTHIC_PLUS_ZONE_ID } from "./generated/seasonConfig";
import { Difficulty, SpecRole } from "./graphql/graphql";

/** Shapes emitted by src-tauri/src/capture.rs on the "sync" event. */
/** `group` is the in-game applicant id: members of one group application share it. */
/** Blizzard's classIDs, which is what the strip carries -- see CLASS_IDS in the addon's Core.lua. */
export const CLASS_BY_ID: Record<number, string> = {
  1: "WARRIOR", 2: "PALADIN", 3: "HUNTER", 4: "ROGUE", 5: "PRIEST", 6: "DEATHKNIGHT", 7: "SHAMAN",
  8: "MAGE", 9: "WARLOCK", 10: "MONK", 11: "DRUID", 12: "DEMONHUNTER", 13: "EVOKER",
};

/** The strip carries what the game knows better than the API does; score comes from the lookup. */
export type Applicant = {
  name: string;
  realm: string;
  role: "T" | "H" | "D" | "";
  /** Blizzard classID, 0 when the game did not report one. */
  classId: number;
  /** Equipped item level from the game -- live, where the API's is a cached snapshot. 0 when
   *  the applicant's info had not loaded, in which case the lookup fills it in. */
  ilvl: number;
  group: number;
  /** Best key level in the listed dungeon (M+ listings only, else 0) and whether it was timed. */
  bestLevel: number;
  bestTimed: boolean;
};
/** Strip role letter to the backend's SpecRole; "" (unknown) sends nothing. */
const SPEC_ROLE: Record<Applicant["role"], SpecRole | undefined> = {
  T: SpecRole.Tank,
  H: SpecRole.Healer,
  D: SpecRole.Dps,
  "": undefined,
};

export type Frame = {
  hb: number;
  region: string;
  realm: string;
  sessionId: number;
  activityId: number;
  title: string;
  total: number;
  /** "N" | "H" | "M" raid difficulty, "+" for Mythic+, "" unknown. */
  difficulty: string;
  applicants: Applicant[];
};
export type Link = "no_window" | "no_hud" | "ok" | "lost" | "incompatible" | "addon_outdated" | "app_outdated";
type SyncEvent = { kind: "status"; status: Link } | ({ kind: "data" } & Frame);

export type Session = {
  id: number;
  region: string;
  title: string;
  activityId: number;
  difficulty: string;
  startedAt: number;
  applicants: Applicant[];
  /** Pending applicants in game, which can exceed `applicants` (the strip caps at 20). */
  total: number;
};

/** GraphQL Difficulty enum value for the session's raid difficulty, if it is a raid. */
export const gqlDifficulty = (d: string): Difficulty | undefined =>
  ({ N: Difficulty.Normal, H: Difficulty.Heroic, M: Difficulty.Mythic })[d as "N" | "H" | "M"];
type PartState = {
  state: "loading" | "done" | "error";
  error?: string;
  /** When an error was recorded, so the lookup can be retried automatically. */
  failedAt?: number;
};

/** Each upstream is fetched and tracked on its own, so a slow RaiderIO leaves the
 *  identity fields and parses free to land; `entry` merges the parts as they do. */
export type Lookup = {
  parts: Partial<Record<Part, PartState>>;
  entry?: RosterEntry;
};

/** How long a failed lookup sits before the next frame re-queues it. */
const RETRY_AFTER_MS = 30_000;

/** Queue a part when nothing is known yet, or the last attempt failed long enough ago. */
const needsPart = (l: Lookup | undefined, p: Part) => {
  const s = l?.parts[p];
  return s === undefined || (s.state === "error" && Date.now() - (s.failedAt ?? 0) > RETRY_AFTER_MS);
};
const needsLookup = (l: Lookup | undefined) => PARTS.some((p) => needsPart(l, p));

/** Still waiting on at least one upstream. */
export const isLoading = (l: Lookup | undefined) => PARTS.some((p) => l?.parts[p]?.state === "loading");
/** First error across the upstreams, if any failed. */
export const errorOf = (l: Lookup | undefined) =>
  PARTS.map((p) => l?.parts[p]).find((s) => s?.state === "error")?.error;

export const keyOf = (a: { name: string; realm: string }) => `${a.name.toLowerCase()}-${slugRealm(a.realm)}`;

export type Events = {
  onNewListing?: (session: Session) => void;
  onNewApplicants?: (applicants: Applicant[], session: Session) => void;
};

export function useCompanion(events: Events) {
  const [link, setLink] = useState<Link>("no_window");
  const [session, setSession] = useState<Session | null>(null);
  const [lookups, setLookups] = useState<Record<string, Lookup>>({});
  /** When each applicant key was first seen; drives the "new" badge. */
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);

  // Refs so the event listener (registered once) sees current values.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const lookupsRef = useRef(lookups);
  lookupsRef.current = lookups;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const seenRef = useRef<Record<string, number>>({});
  const pending = useRef<{ region: string; parts: Record<Part, Applicant[]> }>({ region: "", parts: { core: [], rio: [], logs: [] } });
  const debounce = useRef<number | undefined>(undefined);

  /** One part for one chunk; each part runs its own chunks so a slow upstream
   *  only holds up its own column. */
  const runPart = async (
    part: Part,
    region: string,
    applicants: Applicant[],
    scope: { difficulty?: Difficulty } | { zoneId?: number }
  ) => {
    for (let i = 0; i < applicants.length; i += CHUNK_SIZE) {
      const chunk = applicants.slice(i, i + CHUNK_SIZE);
      try {
        const entries = await lookupCharacters(
          part,
          region,
          // Send the role the applicant signed up as: their active spec can say
          // otherwise (a healer Evoker sitting in Devastation), and the backend
          // picks the parse metric from this.
          chunk.map((a) => ({ name: a.name, realm: slugRealm(a.realm), role: SPEC_ROLE[a.role] })),
          scope
        );
        if (part === "core") count("notFound", entries.filter((e) => e.notFound).length);
        setLookups((l) => {
          const next = { ...l };
          for (const e of entries) {
            const prev = next[keyOf(e)];
            next[keyOf(e)] = {
              parts: { ...prev?.parts, [part]: { state: "done" } },
              entry: {
                ...prev?.entry,
                ...e,
                character: e.character
                  ? { ...prev?.entry?.character, ...e.character }
                  : (prev?.entry?.character ?? null),
              },
            };
          }
          return next;
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        count("lookupErrors", chunk.length);
        setLookups((l) => {
          const next = { ...l };
          for (const a of chunk) {
            const prev = next[keyOf(a)];
            next[keyOf(a)] = {
              ...prev,
              parts: { ...prev?.parts, [part]: { state: "error", error, failedAt: Date.now() } },
            };
          }
          return next;
        });
      }
    }
  };

  const flushLookups = () => {
    const { region, parts } = pending.current;
    const isKeys = sessionRef.current?.difficulty === "+";
    const difficulty = gqlDifficulty(sessionRef.current?.difficulty ?? "");
    const scope = isKeys ? { zoneId: MYTHIC_PLUS_ZONE_ID } : { difficulty };
    pending.current = { region, parts: { core: [], rio: [], logs: [] } };
    const queued = new Set(PARTS.flatMap((p) => parts[p].map(keyOf)));
    if (queued.size) count("lookups", queued.size);
    for (const p of PARTS) void runPart(p, region, parts[p], scope);
  };

  /** Mark as loading and queue, deduped by key: the backend answers a duplicate
   *  inside one chunk with a notFound placeholder, which would blank the row. */
  const queueLookups = (region: string, applicants: Applicant[]) => {
    const parts = { ...pending.current.parts };
    const loading: Record<string, Lookup> = {};
    for (const p of PARTS) {
      const queued = new Set(parts[p].map(keyOf));
      const add: Applicant[] = [];
      for (const a of applicants) {
        const key = keyOf(a);
        if (queued.has(key) || !needsPart(lookupsRef.current[key], p)) continue;
        queued.add(key);
        add.push(a);
        const prev = loading[key] ?? lookupsRef.current[key];
        loading[key] = { ...prev, parts: { ...prev?.parts, [p]: { state: "loading" } } };
      }
      parts[p] = [...parts[p], ...add];
    }
    if (!Object.keys(loading).length) return;
    // Mirror into the ref as well as state: the next frame arrives in 250 ms and
    // must not re-queue these before React has re-rendered.
    lookupsRef.current = { ...lookupsRef.current, ...loading };
    setLookups((l) => ({ ...l, ...loading }));
    pending.current = { region, parts };
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(flushLookups, 300);
  };

  const onFrame = (f: Frame) => {
    setLastFrameAt(Date.now());
    const current = sessionRef.current;
    if (f.sessionId === 0) {
      if (current) setSession(null);
      return;
    }
    let s = current;
    let adopted = false;
    if (s && s.id !== f.sessionId && s.title === f.title) {
      // Same listing, new id: the addon was /reload-ed (its id is its load time).
      s = { ...s, id: f.sessionId };
    } else if (!s || s.id !== f.sessionId) {
      s = { id: f.sessionId, region: f.region, title: f.title, activityId: f.activityId, difficulty: f.difficulty, startedAt: Date.now(), applicants: [], total: 0 };
      // Lookups are difficulty-specific (logs, prog); a listing at another difficulty starts clean.
      if (current && current.difficulty !== f.difficulty) {
        lookupsRef.current = {};
        setLookups({});
      }
      seenRef.current = {};
      setSeenAt({});
      // A listing that was already up when the app started is not "new".
      adopted = !current;
      if (current) eventsRef.current.onNewListing?.(s);
    }
    // A transient failure must not blank an applicant for the rest of the session:
    // any part errored longer than the cooldown ago is queued again below.
    const stale = f.applicants.filter((a) => needsLookup(lookupsRef.current[keyOf(a)]));
    if (stale.length) queueLookups(f.region, stale);
    const fresh = f.applicants.filter((a) => seenRef.current[keyOf(a)] === undefined);
    if (fresh.length) {
      const now = Date.now();
      for (const a of fresh) seenRef.current[keyOf(a)] = now;
      setSeenAt({ ...seenRef.current });
      const unknown = fresh.filter((a) => needsLookup(lookupsRef.current[keyOf(a)]));
      if (unknown.length) queueLookups(f.region, unknown);
      // Applicants already pending when the app started are not new arrivals;
      // notifying for them would fire a toast and a sound on every launch.
      if (!adopted) eventsRef.current.onNewApplicants?.(fresh, s);
    }
    setSession({ ...s, title: f.title, difficulty: f.difficulty, applicants: f.applicants, total: f.total });
  };

  useEffect(() => {
    const handle = (payload: SyncEvent) => {
      if (payload.kind === "status") setLink(payload.status);
      else {
        setLink("ok");
        onFrame(payload);
      }
    };
    const unlisten = listen<SyncEvent>("sync", (e) => handle(e.payload));
    // The capture thread starts before this webview mounts; pick up whatever it
    // already emitted so an already-listed group shows immediately.
    unlisten.then(() =>
      invoke<{ status: Link | ""; frame: Frame | null }>("sync_snapshot").then((snap) => {
        if (snap.frame) handle({ kind: "data", ...snap.frame });
        else if (snap.status) handle({ kind: "status", status: snap.status });
      })
    );
    return () => {
      unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { link, session, lookups, seenAt, lastFrameAt };
}
