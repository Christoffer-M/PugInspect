import type { CSSProperties } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CLASS_FILE_NAMES, RAID_DIFFICULTY_COLORS, getClassColor, getParseColor, slugRealm } from "@repo/ui";
import { DEFAULT_RAID } from "../generated/seasonConfig";
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

/** Highest difficulty with a kill on the season's raid (same DEFAULT_RAID the web app uses). */
function progOf(entry?: RosterEntry): { text: string; color: string } | null {
  const p = entry?.character?.raiderIo?.raidProgression?.find((r) => r.raid === DEFAULT_RAID);
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
  const loading = lookup?.state === "loading";
  const best = c?.raidLogs?.bestPerformanceAverage;
  const skeleton = <span className={classes.skeletonBar} />;

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
      <div className={classes.ident}>
        <div className={classes.nameLine}>
          <span className={classes.name}>{a.name}</span>
          {isNew && <span className={classes.tag}>new</span>}
          {notFound && <span className={`${classes.tag} ${classes.tagWarn}`}>not found</span>}
        </div>
        <span className={classes.sub}>
          {prettyRealm(a.realm)} · {c?.activeSpec ? `${c.activeSpec} ` : ""}
          {className}
          {lookup?.state === "error" && (
            <span className={app.mono} style={{ color: "#f4c15e" }} title={lookup.error}>
              {" "}lookup failed
            </span>
          )}
        </span>
      </div>
      <span className={classes.value} style={{ color: ilvl ? "var(--pi-text-bright)" : DIM }}>
        {ilvl || "-"}
      </span>
      <span className={classes.value} style={{ color: rio?.color ?? (a.rio ? "var(--mantine-color-dark-0)" : DIM) }}>
        {loading && !rio && !a.rio ? skeleton : Math.round(rio?.score ?? a.rio) || "-"}
      </span>
      <span className={classes.value} style={{ color: best != null ? getParseColor(best) : DIM }}>
        {loading ? skeleton : best != null ? Math.floor(best) : "-"}
      </span>
      <span className={classes.value} style={{ color: prog?.color ?? DIM }}>
        {loading ? skeleton : (prog?.text ?? "-")}
      </span>
      <span className={classes.open}>↗</span>
    </a>
  );
}
