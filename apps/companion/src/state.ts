import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { slugRealm } from "@repo/ui";
import { CHUNK_SIZE, lookupCharacters, type RosterEntry } from "./api";

/** Shapes emitted by src-tauri/src/capture.rs on the "sync" event. */
export type Applicant = { name: string; realm: string; class: string; role: "T" | "H" | "D" | ""; ilvl: number; rio: number };
export type Frame = {
  hb: number;
  region: string;
  realm: string;
  sessionId: number;
  activityId: number;
  title: string;
  total: number;
  applicants: Applicant[];
};
export type Link = "no_window" | "ok" | "lost";
type SyncEvent = { kind: "status"; status: Link } | ({ kind: "data" } & Frame);

export type Session = {
  id: number;
  region: string;
  title: string;
  activityId: number;
  startedAt: number;
  applicants: Applicant[];
};
export type Lookup = { state: "loading" | "done" | "error"; entry?: RosterEntry; error?: string };

export const keyOf = (a: { name: string; realm: string }) => `${a.name.toLowerCase()}-${slugRealm(a.realm)}`;

const HISTORY_KEY = "pi-history";
const loadHistory = (): Session[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
};

export type Events = {
  onNewListing?: (session: Session) => void;
  onNewApplicants?: (applicants: Applicant[], session: Session) => void;
};

export function useCompanion(events: Events) {
  const [link, setLink] = useState<Link>("no_window");
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>(loadHistory);
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
  const pending = useRef<{ region: string; applicants: Applicant[] }>({ region: "", applicants: [] });
  const debounce = useRef<number | undefined>(undefined);

  const archive = (s: Session) =>
    setHistory((h) => {
      const next = [s, ...h.filter((x) => x.id !== s.id)].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });

  const flushLookups = async () => {
    const { region, applicants } = pending.current;
    pending.current = { region, applicants: [] };
    for (let i = 0; i < applicants.length; i += CHUNK_SIZE) {
      const chunk = applicants.slice(i, i + CHUNK_SIZE);
      try {
        const entries = await lookupCharacters(
          region,
          chunk.map((a) => ({ name: a.name, realm: slugRealm(a.realm) }))
        );
        setLookups((l) => {
          const next = { ...l };
          for (const e of entries) next[keyOf(e)] = { state: "done", entry: e };
          return next;
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setLookups((l) => {
          const next = { ...l };
          for (const a of chunk) next[keyOf(a)] = { state: "error", error };
          return next;
        });
      }
    }
  };

  const onFrame = (f: Frame) => {
    setLastFrameAt(Date.now());
    const current = sessionRef.current;
    if (f.sessionId === 0) {
      if (current) {
        archive(current);
        setSession(null);
      }
      return;
    }
    let s = current;
    if (s && s.id !== f.sessionId && s.title === f.title) {
      // Same listing, new id: the addon was /reload-ed (its id is its load time).
      s = { ...s, id: f.sessionId };
    } else if (!s || s.id !== f.sessionId) {
      if (current) archive(current);
      s = { id: f.sessionId, region: f.region, title: f.title, activityId: f.activityId, startedAt: Date.now(), applicants: [] };
      seenRef.current = {};
      setSeenAt({});
      // A listing that was already up when the app started is not "new".
      if (current) eventsRef.current.onNewListing?.(s);
    }
    const fresh = f.applicants.filter((a) => seenRef.current[keyOf(a)] === undefined);
    if (fresh.length) {
      const now = Date.now();
      for (const a of fresh) seenRef.current[keyOf(a)] = now;
      setSeenAt({ ...seenRef.current });
      const unknown = fresh.filter((a) => lookupsRef.current[keyOf(a)] === undefined);
      if (unknown.length) {
        setLookups((l) => ({ ...l, ...Object.fromEntries(unknown.map((a) => [keyOf(a), { state: "loading" }])) }));
        pending.current = { region: f.region, applicants: [...pending.current.applicants, ...unknown] };
        window.clearTimeout(debounce.current);
        debounce.current = window.setTimeout(flushLookups, 300);
      }
      eventsRef.current.onNewApplicants?.(fresh, s);
    }
    setSession({ ...s, title: f.title, applicants: f.applicants });
  };

  useEffect(() => {
    const unlisten = listen<SyncEvent>("sync", ({ payload }) => {
      if (payload.kind === "status") setLink(payload.status);
      else {
        setLink("ok");
        onFrame(payload);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = (key: string, a: Applicant, region: string) => {
    setLookups((l) => ({ ...l, [key]: { state: "loading" } }));
    pending.current = { region, applicants: [...pending.current.applicants, a] };
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(flushLookups, 0);
  };

  return { link, session, history, lookups, seenAt, lastFrameAt, retry };
}
