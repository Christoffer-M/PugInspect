import { Fragment, useEffect, useMemo } from "react";
import {
  createColumnHelper,
  createExpandedRowModel,
  createSortedRowModel,
  flexRender,
  rowExpandingFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { Tooltip } from "@mantine/core";
import { IconArrowsSort, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { CURRENT_DUNGEONS } from "../../generated/seasonConfig";
import { getClassColor } from "../../util/util";
import { SpecImage } from "../ui/SpecImage";
import type { MythicPlusSpecStats, SpecStat } from "../../queries/mythic-plus-spec-stats";
import classes from "./SpecMeta.module.css";

export type Role = "DPS" | "HEALER" | "TANK";

export const ROLES: { id: Role; label: string }[] = [
  { id: "DPS", label: "DPS" },
  { id: "HEALER", label: "Healer" },
  { id: "TANK", label: "Tank" },
];

export type SortKey = "median" | "p95" | "max";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "median", label: "Median" },
  { key: "p95", label: "p95" },
  { key: "max", label: "Max" },
];

/**
 * A table row: pooled spec stats, or — in the dungeon-scoped view — the spec
 * with one dungeon's stats swapped in, including that dungeon's best-run link.
 */
type ViewSpec = SpecStat & { maxReportUrl?: string | null };

const features = tableFeatures({
  rowSortingFeature,
  rowExpandingFeature,
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, ViewSpec>();

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
  /** Which healer throughput to rank — healers carry both. */
  healerMetric: "hps" | "dps";
  /** null = pooled across all dungeons; otherwise one dungeon's encounterId. */
  dungeon: number | null;
};

export function SpecMetaTable({ data, role, healerMetric, dungeon }: Props) {
  const minParses =
    dungeon == null
      ? data.minParsesToRank
      : Math.ceil(data.minParsesToRank / Math.max(1, data.dungeons.length));

  // Dungeon-scoped view swaps each spec's pooled numbers for its stats in that
  // dungeon — the per-dungeon rows are shipped with the response either way.
  const rows = useMemo<ViewSpec[]>(() => {
    const metric = role === "HEALER" ? healerMetric : "dps";
    const inRole = data.specs.filter((s) => s.role === role && s.metric === metric);
    if (dungeon == null) return inRole;
    return inRole.flatMap((s) => {
      const d = s.dungeons.find((x) => x.encounterId === dungeon);
      return d
        ? [{
            ...s,
            parses: d.parses,
            median: d.median,
            p95: d.p95,
            max: d.max,
            medianKey: d.medianKey,
            maxReportUrl: d.maxReportUrl,
            dungeons: [],
          }]
        : [];
    });
  }, [data, role, healerMetric, dungeon]);

  const dungeonNames = useMemo(
    () => new Map(data.dungeons.map((d) => [d.encounterId, d.name])),
    [data.dungeons]
  );

  // Zoomed axis: from 80% of the field's lowest ranked median to the field's
  // best parse, rounded to a step one order of magnitude below the scale.
  // The candlestick wick runs out to the max, so the axis has to reach it —
  // topping out at the p95 ceiling pinned nearly every wick to the track end.
  const { axisLo, axisHi } = useMemo(() => {
    const ranked = rows.filter((r) => r.parses >= minParses);
    const pool = ranked.length > 0 ? ranked : rows;
    const ceiling = Math.max(0, ...pool.map((s) => s.max));
    if (ceiling <= 0) return { axisLo: 0, axisHi: 50_000 };
    const step = 10 ** Math.floor(Math.log10(ceiling)) / 10;
    const floor = Math.min(...pool.map((s) => s.median));
    const axisLo = Math.max(0, Math.floor((floor * 0.8) / step) * step);
    const axisHi = Math.ceil(ceiling / step) * step;
    return { axisLo, axisHi };
  }, [rows, minParses]);

  const metricLabel = role === "HEALER" && healerMetric === "hps" ? "HPS" : "DPS";

  const columns = useMemo(() => {
    const isLow = (s: ViewSpec) => s.parses < minParses;

    const pct = (v: number) =>
      Math.max(0, Math.min(100, ((v - axisLo) / (axisHi - axisLo)) * 100));

    // Thin specs read as undefined so sortUndefined pins them to the bottom in
    // BOTH directions — a numeric sentinel would float them to the top when
    // ascending.
    const stat = (key: SortKey, label: string) =>
      columnHelper.accessor((row: ViewSpec) => (isLow(row) ? undefined : row[key]), {
        id: key,
        header: label,
        sortUndefined: "last",
        sortDescFirst: true,
        cell: (info) => {
          const s = info.row.original;
          const active = info.column.getIsSorted() !== false;
          const className = `${classes.statCol} ${active ? classes.statActive : classes.statInactive}`;
          const style = isLow(s) && active ? { color: "#6b7590" } : undefined;
          // In the dungeon-scoped view the max is one specific run, so it
          // links straight to the log — same as the expanded overview.
          if (key === "max" && !isLow(s) && s.maxReportUrl) {
            return (
              <a
                data-label={key}
                className={`${className} ${classes.detailLink}`}
                href={s.maxReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the run on WarcraftLogs"
              >
                {k(s[key])}
              </a>
            );
          }
          return (
            <span
              data-label={key === "median" ? "med" : key}
              className={className}
              style={style}
            >
              {isLow(s) ? "—" : k(s[key])}
            </span>
          );
        },
      });

    return [
      columnHelper.display({
        id: "rank",
        header: "#",
        cell: (info) => {
          const s = info.row.original;
          const rank = info.table.getRowModel().rows.findIndex((r) => r.id === info.row.id) + 1;
          return (
            <span className={`${classes.colRank} ${classes.rank} ${rank <= 3 && !isLow(s) ? classes.rankTop : ""}`}>
              {isLow(s) ? "—" : rank}
            </span>
          );
        },
      }),
      columnHelper.accessor("specName", {
        id: "spec",
        header: "Spec",
        enableSorting: false,
        cell: (info) => {
          const s = info.row.original;
          const color = getClassColor(s.className);
          return (
            <span className={classes.specCell}>
              <SpecImage className={s.className} spec={s.specName} />
              <span className={classes.specLabels}>
                <span
                  className={classes.specName}
                  style={{
                    color: isLow(s) ? "#8a96aa" : color,
                    // Priest white vanishes against the panel without a halo.
                    textShadow: s.classSlug === "Priest" ? "0 0 12px rgba(255,255,255,0.25)" : undefined,
                  }}
                >
                  {s.specName}
                </span>
                <span className={classes.className}>
                  {s.className}
                  {!isLow(s) && <span className={classes.typicalKey}> · ~+{s.medianKey}</span>}
                </span>
              </span>
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "bar",
        header: () => (
          <span className={classes.axis}>
            <span>{k(axisLo)}</span>
            <span className={classes.axisMid}>{k((axisLo + axisHi) / 2)}</span>
            <span className={classes.axisHi}>{k(axisHi)}</span>
          </span>
        ),
        cell: (info) => {
          const s = info.row.original;
          const color = getClassColor(s.className);
          const medianPct = pct(s.median);
          const p95Pct = pct(s.p95);
          const maxPct = pct(s.max);
          return (
            <span className={classes.colBar}>
              <span className={classes.track}>
                <span className={classes.trackBase} />
                {!isLow(s) && (
                  <>
                    <span
                      className={classes.wick}
                      style={{
                        left: `${p95Pct}%`,
                        width: `${Math.max(0, maxPct - p95Pct)}%`,
                        background: withAlpha(color, 0.45),
                      }}
                    />
                    <span
                      className={classes.tickMax}
                      style={{ left: `${maxPct}%`, background: withAlpha(color, 0.6) }}
                    />
                    <span
                      className={classes.bodyMedian}
                      style={{ width: `${medianPct}%`, background: withAlpha(color, 0.8) }}
                    />
                    <span
                      className={classes.bodyP95}
                      style={{
                        left: `${medianPct}%`,
                        width: `${Math.max(0, p95Pct - medianPct)}%`,
                        background: withAlpha(color, 0.24),
                        boxShadow: `inset 0 0 0 1px ${color}`,
                      }}
                    />
                    <span
                      className={classes.markMedian}
                      style={{ left: `${medianPct}%`, background: color }}
                    />
                  </>
                )}
              </span>
            </span>
          );
        },
      }),
      stat("median", "Median"),
      stat("p95", "p95"),
      stat("max", "Max"),
      columnHelper.display({
        id: "chev",
        header: "",
        cell: (info) => (
          <span className={classes.colChev}>
            {info.row.getCanExpand() && (
              <IconChevronDown
                size={12}
                stroke={2.5}
                className={`${classes.chev} ${info.row.getIsExpanded() ? classes.chevOpen : ""}`}
              />
            )}
          </span>
        ),
      }),
    ];
  }, [minParses, axisLo, axisHi]) as ColumnDef<typeof features, SpecStat>[];


  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (s: ViewSpec) => `${s.classSlug}/${s.specSlug}`,
    getRowCanExpand: (row: Row<typeof features, ViewSpec>) =>
      row.original.parses >= minParses && row.original.dungeons.length > 0,
    initialState: { sorting: [{ id: "median", desc: true }] },
  });

  // Row identity is spec-based and survives role/dungeon switches, so an open
  // row would otherwise stay marked expanded across a view change.
  useEffect(() => {
    table.resetExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, healerMetric, dungeon]);

  const activeSort = table.state.sorting?.[0];
  const sortBy = (activeSort?.id ?? "median") as SortKey;
  const sortDesc = activeSort?.desc ?? true;
  // First click on a column ranks by it (best first); clicking it again flips
  // the direction.
  const setSort = (key: SortKey) =>
    table.setSorting([{ id: key, desc: sortBy === key ? !sortDesc : true }]);

  if (rows.length === 0) {
    return (
      <div className={classes.panel}>
        <div className={classes.lowSample} style={{ padding: "18px 16px" }}>
          Nothing to show for this view — try another role, metric, or dungeon.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={classes.panel}>
        <div className={classes.head}>
          {table.getFlatHeaders().map((header) => {
            const content = flexRender(header.column.columnDef.header, header.getContext());
            const element = header.column.getCanSort() ? (
              <button
                type="button"
                className={`${classes.headSort} ${header.column.getIsSorted() ? classes.headSortActive : ""}`}
                aria-pressed={!!header.column.getIsSorted()}
                onClick={() => setSort(header.column.id as SortKey)}
              >
                {content}
                {header.column.getIsSorted() === "desc" ? (
                  <IconChevronDown size={10} stroke={2.5} className={classes.sortIcon} />
                ) : header.column.getIsSorted() === "asc" ? (
                  <IconChevronUp size={10} stroke={2.5} className={classes.sortIcon} />
                ) : (
                  <IconArrowsSort size={10} stroke={2} className={classes.sortIcon} />
                )}
              </button>
            ) : (
              <span
                className={HEADER_CLASS[header.column.id] ?? ""}
                style={header.column.id === "spec" ? { paddingLeft: 34 } : undefined}
              >
                {content}
              </span>
            );
            const tip = HEADER_TOOLTIP[header.column.id];
            return tip ? (
              <Tooltip key={header.id} label={tip} multiline maw={280} withArrow openDelay={200}>
                {element}
              </Tooltip>
            ) : (
              <Fragment key={header.id}>{element}</Fragment>
            );
          })}
        </div>

        <div className={classes.mobileSort} role="group" aria-label="Sort by">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${classes.mobileSortBtn} ${sortBy === o.key ? classes.mobileSortBtnActive : ""}`}
              aria-pressed={sortBy === o.key}
              onClick={() => setSort(o.key)}
            >
              {o.label}
              {sortBy === o.key ? (
                sortDesc ? (
                  <IconChevronDown size={13} stroke={2.5} className={classes.sortIcon} />
                ) : (
                  <IconChevronUp size={13} stroke={2.5} className={classes.sortIcon} />
                )
              ) : (
                <IconArrowsSort size={13} stroke={2} className={classes.sortIcon} />
              )}
            </button>
          ))}
        </div>

        {table.getRowModel().rows.map((row) => {
          const s = row.original;
          const low = s.parses < minParses;
          const isOpen = row.getIsExpanded();
          const canExpand = row.getCanExpand();
          const cells = row.getAllCells().map((cell) => (
            <Fragment key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Fragment>
          ));
          return (
            <div key={row.id} className={`${classes.rowWrap} ${isOpen ? classes.rowOpen : ""}`}>
              {canExpand ? (
                <button
                  type="button"
                  className={classes.row}
                  onClick={row.getToggleExpandedHandler()}
                  aria-expanded={isOpen}
                >
                  {cells}
                </button>
              ) : (
                // A disabled button would swallow clicks on the max link, so
                // non-expandable rows are plain divs.
                <div className={`${classes.row} ${classes.rowStatic}`}>{cells}</div>
              )}

              {isOpen && !low && (
                <DungeonDetail
                  spec={s}
                  metricLabel={metricLabel}
                  dungeonNames={dungeonNames}
                  sortBy={sortBy}
                />
              )}

              {low && (
                <div className={classes.lowSample}>
                  Needs {minParses} parses to rank. Nothing is being hidden — this spec is simply too
                  rare at these keys for a stable median.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={classes.legend}>
        <div className={classes.legendItems}>
          <span className={classes.legendItem}><span className={classes.swatchMedian} /> median</span>
          <span className={classes.legendItem}><span className={classes.swatchP95} /> up to top 5%</span>
          <span className={classes.legendItem}><span className={classes.swatchMax} /> best parse</span>
        </div>
        <span>
          Rows sorted by {SORT_OPTIONS.find((o) => o.key === sortBy)?.label.toLowerCase() ?? "median"}
          {sortDesc ? "" : ", ascending"}. Click a spec for its per-dungeon split.
        </span>
      </div>
    </>
  );
}

const HEADER_TOOLTIP: Record<string, string> = {
  rank: "Position under the current sort. Specs with too few parses sit unranked at the bottom.",
  spec: "Class specialization, colored by class. The ~+N under the name is the typical key level of the spec's sampled runs.",
  bar: "Filled body = median, hollow body = up to the top 5%, wick out to the single best parse — all raw, all the same scale. The axis spans the field's range — lowest median to best parse — not zero, to magnify the differences between specs.",
  median:
    "Typical raw throughput across the spec's sampled runs — the median of what was actually logged, at the keys it was logged at. Click to rank by it.",
  p95: "What the spec does when played well: the top-5% cutoff of its sampled runs, raw. Click to rank by it.",
  max: "The single best parse in the sample — a real, findable log. Click to rank by it (again to flip direction), then expand a row to open the run on WarcraftLogs.",
};

const HEADER_CLASS: Record<string, string> = {
  rank: classes.colRank!,
  spec: classes.colSpec!,
  bar: classes.colBar!,
  chev: classes.colChev!,
};

function DungeonDetail({
  spec,
  metricLabel,
  dungeonNames,
  sortBy,
}: {
  spec: SpecStat;
  metricLabel: string;
  dungeonNames: Map<number, string>;
  sortBy: SortKey;
}) {
  // The panel mirrors whichever stat the table is sorted by, so the expanded
  // numbers always decompose the value the row is ranked on.
  const detail = spec.dungeons
    .map((d) => ({
      ...d,
      name: dungeonNames.get(d.encounterId) ?? `Dungeon ${d.encounterId}`,
      value: d[sortBy],
    }))
    // The backend orders by median; re-rank by whichever stat the panel shows.
    .sort((a, b) => b.value - a.value);
  const detailPeak = Math.max(1, ...detail.map((d) => d.value));
  const color = getClassColor(spec.className);
  const statLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label.toLowerCase() ?? "median";

  return (
    <div className={classes.detail}>
      <div className={classes.detailHead}>
        <span>Per dungeon · {metricLabel} · fastest runs</span>
        <span className={classes.detailNote}>
          {spec.parses.toLocaleString("en-US")} parses · {statLabel} {metricLabel} per run
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
                  width: `${(d.value / detailPeak) * 100}%`,
                  background: `linear-gradient(90deg, ${withAlpha(color, 0.35)} 0%, ${color} 100%)`,
                }}
              />
            </span>
            {sortBy === "max" && d.maxReportUrl ? (
              <a
                className={`${classes.detailValue} ${classes.detailLink}`}
                href={d.maxReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the run on WarcraftLogs"
              >
                {k(d.value)}
              </a>
            ) : (
              <span className={classes.detailValue}>{k(d.value)}</span>
            )}
            {/* Max is one specific run, so its key level is a fact worth showing.
                A key badge next to a median or p95 would just be a typical value
                masquerading as provenance. */}
            {sortBy === "max" && d.maxKey != null && (
              <span className={classes.detailKey}>+{d.maxKey}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
