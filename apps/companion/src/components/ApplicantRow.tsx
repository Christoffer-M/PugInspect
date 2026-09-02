import type { CSSProperties } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CLASS_FILE_NAMES, ParsePill, RAID_DIFFICULTY_COLORS, getClassColor, slugRealm } from "@repo/ui";
import type { RosterEntry } from "../api";
import type { Applicant, Lookup } from "../state";
import app from "../App.module.css";
import classes from "./Applicants.module.css";

const DIM = "var(--mantine-color-dark-2)";

/** "TarrenMill" → "Tarren Mill" via the slug; good enough for a subtitle. */
const prettyRealm = (realm: string) =>
  slugRealm(realm)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** Highest difficulty with a kill on the character's current raid. */
function progOf(entry?: RosterEntry): { text: string; color: string } | null {
  // ponytail: raidProgression[0] is the current tier as raider.io orders it;
  // the web app matches DEFAULT_RAID from the generated season config instead.
  const p = entry?.character?.raiderIo?.raidProgression?.[0];
  if (!p || p.total_bosses == null) return null;
  const tiers = [
    ["M", p.mythic_bosses_killed, RAID_DIFFICULTY_COLORS.mythic],
    ["H", p.heroic_bosses_killed, RAID_DIFFICULTY_COLORS.heroic],
    ["N", p.normal_bosses_killed, RAID_DIFFICULTY_COLORS.normal],
  ] as const;
  const hit = tiers.find(([, kills]) => (kills ?? 0) > 0);
  if (!hit) return { text: `0/${p.total_bosses}`, color: DIM };
  return { text: `${hit[1]}/${p.total_bosses} ${hit[0]}`, color: hit[2] };
}

export function ApplicantRow({
  region,
  applicant: a,
  lookup,
  isNew,
}: {
  region: string;
  applicant: Applicant;
  lookup?: Lookup;
  isNew: boolean;
}) {
  const c = lookup?.entry?.character;
  const notFound = lookup?.entry?.notFound === true;
  const className = c?.class ?? CLASS_FILE_NAMES[a.class] ?? a.class;
  const color = getClassColor(className);
  const rio = c?.raiderIo?.currentSeason?.all;
  const prog = progOf(lookup?.entry);
  const ilvl = c?.equippedItemLevel ?? a.ilvl;

  return (
    <a
      className={`${classes.row} ${isNew ? classes.rowNew : ""} ${notFound ? classes.rowNotFound : ""}`}
      style={{ "--class-color": color } as CSSProperties}
      onClick={(e) => {
        e.preventDefault();
        if (!notFound) openUrl(`https://puginspect.com/${region}/${slugRealm(a.realm)}/${a.name.toLowerCase()}`);
      }}
      href="#"
    >
      <span className={classes.role}>{a.role || "·"}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={classes.name}>{a.name}</span>
          {isNew && <span className={classes.tag}>new</span>}
          {notFound && <span className={`${classes.tag} ${classes.tagWarn}`}>not found</span>}
        </div>
        <span className={classes.sub}>
          {prettyRealm(a.realm)} · {c?.activeSpec ? `${c.activeSpec} ` : ""}
          {className}
          {lookup?.state === "loading" && <span className={app.mono}> looking up…</span>}
        </span>
      </div>
      <span className={classes.value} style={{ color: ilvl ? "var(--pi-text-bright)" : DIM }}>
        {ilvl || "-"}
      </span>
      <span className={classes.value} style={{ color: rio?.color ?? (a.rio ? "var(--mantine-color-dark-0)" : DIM) }}>
        {Math.round(rio?.score ?? a.rio) || "-"}
      </span>
      <span style={{ display: "flex", justifyContent: "center" }}>
        {lookup?.state === "loading" ? (
          <span className={classes.skeletonBar} style={{ width: 28, height: 14 }} />
        ) : (
          <ParsePill value={c?.raidLogs?.bestPerformanceAverage} compact />
        )}
      </span>
      <span className={classes.prog} style={{ color: prog?.color ?? DIM }}>
        {prog?.text ?? "-"}
      </span>
      <span className={classes.open}>↗</span>
    </a>
  );
}
