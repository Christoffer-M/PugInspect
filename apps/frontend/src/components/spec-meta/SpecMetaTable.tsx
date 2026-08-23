import { useMemo, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { CURRENT_DUNGEONS } from "../../generated/seasonConfig";
import { getClassColor } from "../../util/util";
import { SpecImage } from "../ui/SpecImage";
import type { MythicPlusSpecStats, SpecStat } from "../../queries/mythic-plus-spec-stats";
import classes from "./SpecMeta.module.css";

export type Role = "DPS" | "HEALER" | "TANK";

export type SortKey = "median" | "p95" | "max";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "median", label: "Median" },
  { key: "p95", label: "p95" },
  { key: "max", label: "Max" },
];

export const ROLES: { id: Role; label: string }[] = [
  { id: "DPS", label: "DPS" },
  { id: "HEALER", label: "Healer" },
  { id: "TANK", label: "Tank" },
];

/** 304400 → "304.4k". Throughput is always large enough for this to read well. */
const k = (v: number) => `${(v / 1000).toFixed(1)}k`;

const withAlpha = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const shortNameFor = (name: string) =>
  CURRENT_DUNGEONS.find((d) => d.name === name)?.short_name ??
  name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();

type Props = {
  data: MythicPlusSpecStats;
  role: Role;
  /** null = pooled across all dungeons; otherwise one dungeon's encounterId. */
  dungeon: number | null;
};

export function SpecMetaTable({ data, role, dungeon }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("median");

  const minParses =
    dungeon == null
      ? data.minParsesToRank
      : Math.ceil(data.minParsesToRank / Math.max(1, data.dungeons.length));

  // Dungeon-scoped view swaps each spec's pooled numbers for its stats in that
  // dungeon — the per-dungeon rows are shipped with the response either way.
  // Always re-sorted here: the backend orders by pooled median only, and the
  // active stat column drives the ranking.
  const specs = useMemo(() => {
    const inRole = data.specs.filter((s) => s.role === role);
    const view =
      dungeon == null
        ? inRole
        : inRole.flatMap((s) => {
            const d = s.dungeons.find((x) => x.encounterId === dungeon);
            return d
              ? [{ ...s, parses: d.parses, median: d.median, p95: d.p95, max: d.max, medianKey: d.medianKey, dungeons: [] }]
              : [];
          });
    return view.slice().sort((a, b) => {
      const aThin = a.parses < minParses;
      const bThin = b.parses < minParses;
      if (aThin !== bThin) return aThin ? 1 : -1;
      return b[sortBy] - a[sortBy];
    });
  }, [data, role, dungeon, sortBy, minParses]);
  const dungeonNames = useMemo(
    () => new Map(data.dungeons.map((d) => [d.encounterId, d.name])),
    [data.dungeons]
  );

  // Zero-baseline axis: the whole role shares one scale, topped out just above
  // its single best parse and rounded to a readable number.
  const domain = useMemo(() => {
    const peak = Math.max(0, ...specs.map((s) => s.max));
    return Math.max(50_000, Math.ceil(peak / 50_000) * 50_000);
  }, [specs]);

  const metricLabel = role === "HEALER" ? "HPS" : "DPS";

  if (specs.length === 0) return null;

  return (
    <>
      <div className={classes.panel}>
        <div className={classes.head}>
          <span className={classes.colRank}>#</span>
          <span className={classes.colSpec} style={{ paddingLeft: 34 }}>Spec</span>
          <span className={classes.colBar}>
            <span className={classes.axis}>
              <span>0</span>
              <span className={classes.axisMid}>{k(domain / 2)}</span>
              <span className={classes.axisHi}>{k(domain)}</span>
            </span>
          </span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${classes.headSort} ${sortBy === o.key ? classes.headSortActive : ""}`}
              aria-pressed={sortBy === o.key}
              onClick={() => setSortBy(o.key)}
            >
              {o.label}
            </button>
          ))}
          <span className={classes.parses}>Parses</span>
          <span className={classes.colChev} />
        </div>

        <div className={classes.mobileSort} role="group" aria-label="Sort by">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${classes.keyBtn} ${sortBy === o.key ? classes.keyBtnActive : ""}`}
              aria-pressed={sortBy === o.key}
              onClick={() => setSortBy(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {specs.map((spec, i) => (
          <SpecRow
            key={`${spec.classSlug}/${spec.specSlug}`}
            spec={spec}
            rank={i + 1}
            domain={domain}
            metricLabel={metricLabel}
            minParses={minParses}
            sortBy={sortBy}
            dungeonNames={dungeonNames}
            isOpen={open === `${spec.classSlug}/${spec.specSlug}`}
            onToggle={() =>
              setOpen((cur) => {
                const key = `${spec.classSlug}/${spec.specSlug}`;
                return cur === key ? null : key;
              })
            }
          />
        ))}
      </div>

      <div className={classes.legend}>
        <div className={classes.legendItems}>
          <span className={classes.legendItem}><span className={classes.swatchMedian} /> median</span>
          <span className={classes.legendItem}><span className={classes.swatchP95} /> up to top 5%</span>
          <span className={classes.legendItem}><span className={classes.swatchMax} /> best parse</span>
        </div>
        <span>
          Rows sorted by {SORT_OPTIONS.find((o) => o.key === sortBy)!.label.toLowerCase()}. Click a
          spec for its per-dungeon split.
        </span>
      </div>
    </>
  );
}

type RowProps = {
  spec: SpecStat;
  rank: number;
  domain: number;
  metricLabel: string;
  minParses: number;
  sortBy: SortKey;
  dungeonNames: Map<number, string>;
  isOpen: boolean;
  onToggle: () => void;
};

function SpecRow({
  spec, rank, domain, metricLabel, minParses, sortBy, dungeonNames, isOpen, onToggle,
}: RowProps) {
  const color = getClassColor(spec.className);
  const lowSample = spec.parses < minParses;
  const pct = (v: number) => Math.max(0, Math.min(100, (v / domain) * 100));

  const detail = useMemo(
    () =>
      spec.dungeons.map((d) => ({
        ...d,
        name: dungeonNames.get(d.encounterId) ?? `Dungeon ${d.encounterId}`,
      })),
    [spec.dungeons, dungeonNames]
  );
  const detailPeak = Math.max(1, ...detail.map((d) => d.median));

  const medianPct = pct(spec.median);
  const p95Pct = pct(spec.p95);

  return (
    <div className={`${classes.rowWrap} ${isOpen ? classes.rowOpen : ""}`}>
      <button
        type="button"
        className={`${classes.row} ${lowSample ? classes.rowStatic : ""}`}
        onClick={lowSample || spec.dungeons.length === 0 ? undefined : onToggle}
        aria-expanded={lowSample || spec.dungeons.length === 0 ? undefined : isOpen}
        disabled={lowSample || spec.dungeons.length === 0}
      >
        <span className={`${classes.colRank} ${classes.rank} ${rank <= 3 && !lowSample ? classes.rankTop : ""}`}>
          {lowSample ? "—" : rank}
        </span>

        <span className={classes.specCell}>
          <SpecImage className={spec.className} spec={spec.specName} />
          <span className={classes.specLabels}>
            <span
              className={classes.specName}
              style={{
                color: lowSample ? "#8a96aa" : color,
                // Priest white vanishes against the panel without a halo.
                textShadow: spec.classSlug === "Priest" ? "0 0 12px rgba(255,255,255,0.25)" : undefined,
              }}
            >
              {spec.specName}
            </span>
            <span className={classes.className}>
              {spec.className}
              {!lowSample && <span className={classes.typicalKey}> · ~+{spec.medianKey}</span>}
            </span>
          </span>
        </span>

        <span className={classes.colBar}>
          <span className={classes.track}>
            <span className={classes.trackBg} />
            <span className={classes.trackMid} />
            {!lowSample && (
              <>
                <span
                  className={classes.fillMedian}
                  style={{
                    width: `${medianPct}%`,
                    background: `linear-gradient(90deg, ${withAlpha(color, 0.45)} 0%, ${color} 100%)`,
                  }}
                />
                <span
                  className={classes.fillP95}
                  style={{
                    left: `${medianPct}%`,
                    width: `${Math.max(0, p95Pct - medianPct)}%`,
                    background: withAlpha(color, 0.2),
                  }}
                />
                <span
                  className={classes.markMax}
                  style={{
                    left: `${pct(spec.max)}%`,
                    background: withAlpha(color, 0.35),
                    boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.55)}`,
                  }}
                />
              </>
            )}
          </span>
        </span>

        {SORT_OPTIONS.map((o) => (
          <span
            key={o.key}
            data-label={o.key === "median" ? "med" : o.key}
            className={`${classes.statCol} ${sortBy === o.key ? classes.statActive : classes.statInactive}`}
            style={lowSample && sortBy === o.key ? { color: "#6b7590" } : undefined}
          >
            {lowSample ? "—" : k(spec[o.key])}
          </span>
        ))}
        <span className={`${classes.parses} ${lowSample ? classes.parsesLow : ""}`}>
          {spec.parses.toLocaleString("en-US")}
        </span>
        <span className={classes.colChev}>
          {!lowSample && spec.dungeons.length > 0 && (
            <IconChevronDown size={12} stroke={2.5} className={`${classes.chev} ${isOpen ? classes.chevOpen : ""}`} />
          )}
        </span>
      </button>

      {isOpen && !lowSample && (
        <div className={classes.detail}>
          <div className={classes.detailHead}>
            <span>Per dungeon · {metricLabel} · fastest runs</span>
            <span className={classes.detailNote}>
              {spec.parses.toLocaleString("en-US")} parses · median {metricLabel} per run
            </span>
          </div>
          <div className={classes.detailGrid}>
            {detail.map((d) => (
              <div className={classes.detailRow} key={d.encounterId}>
                <span className={classes.detailShort}>{shortNameFor(d.name)}</span>
                <span className={classes.detailName}>{d.name}</span>
                <span className={classes.detailTrack}>
                  <span
                    className={classes.detailFill}
                    style={{
                      width: `${(d.median / detailPeak) * 100}%`,
                      background: `linear-gradient(90deg, ${withAlpha(color, 0.35)} 0%, ${color} 100%)`,
                    }}
                  />
                </span>
                <span className={classes.detailValue}>{k(d.median)}</span>
                <span className={classes.detailKey}>+{d.medianKey}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowSample && (
        <div className={classes.lowSample}>
          Needs {minParses} parses to rank. Nothing is being hidden — this spec is simply too rare
          at these keys for a stable median.
        </div>
      )}
    </div>
  );
}
