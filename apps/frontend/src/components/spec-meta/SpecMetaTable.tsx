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
  type SortFn,
} from "@tanstack/react-table";
import { Tooltip } from "@mantine/core";
import { IconArrowsSort, IconChevronDown } from "@tabler/icons-react";
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

const features = tableFeatures({
  rowSortingFeature,
  rowExpandingFeature,
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, SpecStat>();

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
  const minParses =
    dungeon == null
      ? data.minParsesToRank
      : Math.ceil(data.minParsesToRank / Math.max(1, data.dungeons.length));

  // Dungeon-scoped view swaps each spec's pooled numbers for its stats in that
  // dungeon — the per-dungeon rows are shipped with the response either way.
  const rows = useMemo(() => {
    const inRole = data.specs.filter((s) => s.role === role);
    if (dungeon == null) return inRole;
    return inRole.flatMap((s) => {
      const d = s.dungeons.find((x) => x.encounterId === dungeon);
      return d
        ? [{ ...s, parses: d.parses, median: d.median, p95: d.p95, max: d.max, medianKey: d.medianKey, dungeons: [] }]
        : [];
    });
  }, [data, role, dungeon]);

  const dungeonNames = useMemo(
    () => new Map(data.dungeons.map((d) => [d.encounterId, d.name])),
    [data.dungeons]
  );

  // Zero-baseline axis: the whole role shares one scale, topped out just above
  // its single best parse and rounded to a readable number.
  const domain = useMemo(() => {
    const peak = Math.max(0, ...rows.map((s) => s.max));
    return Math.max(50_000, Math.ceil(peak / 50_000) * 50_000);
  }, [rows]);

  const metricLabel = role === "HEALER" ? "HPS" : "DPS";

  const columns = useMemo(() => {
    const isLow = (s: SpecStat) => s.parses < minParses;

    // Descending stat sort with thin specs pinned to the bottom: their value
    // reads as -Infinity, which the desc inversion pushes last.
    const thinLast: SortFn<typeof features, SpecStat> = (a, b, columnId) => {
      const value = (r: Row<typeof features, SpecStat>) =>
        isLow(r.original) ? -Infinity : (r.getValue(columnId) as number);
      const va = value(a);
      const vb = value(b);
      return va === vb ? 0 : va < vb ? -1 : 1;
    };

    const pct = (v: number) => Math.max(0, Math.min(100, (v / domain) * 100));

    const stat = (key: SortKey, label: string) =>
      columnHelper.accessor(key, {
        id: key,
        header: label,
        sortFn: thinLast,
        sortDescFirst: true,
        cell: (info) => {
          const s = info.row.original;
          const active = info.column.getIsSorted() !== false;
          return (
            <span
              data-label={key === "median" ? "med" : key}
              className={`${classes.statCol} ${active ? classes.statActive : classes.statInactive}`}
              style={isLow(s) && active ? { color: "#6b7590" } : undefined}
            >
              {isLow(s) ? "—" : k(info.getValue())}
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
                <span className={classes.className}>{s.className}</span>
              </span>
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "bar",
        header: () => (
          <span className={classes.axis}>
            <span>0</span>
            <span className={classes.axisMid}>{k(domain / 2)}</span>
            <span className={classes.axisHi}>{k(domain)}</span>
          </span>
        ),
        cell: (info) => {
          const s = info.row.original;
          const color = getClassColor(s.className);
          const medianPct = pct(s.median);
          const p95Pct = pct(s.p95);
          return (
            <span className={classes.colBar}>
              <span className={classes.track}>
                <span className={classes.trackBg} />
                <span className={classes.trackMid} />
                {!isLow(s) && (
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
                        left: `${pct(s.max)}%`,
                        background: withAlpha(color, 0.35),
                        boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.55)}`,
                      }}
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
      columnHelper.accessor("medianKey", {
        id: "typicalKey",
        header: "Keys",
        enableSorting: false,
        cell: (info) => (
          <span
            className={classes.keyCol}
            title="Typical key level of this spec's sampled runs"
          >
            {isLow(info.row.original) ? "—" : `~+${info.getValue()}`}
          </span>
        ),
      }),
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
  }, [minParses, domain]) as ColumnDef<typeof features, SpecStat>[];


  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (s: SpecStat) => `${s.classSlug}/${s.specSlug}`,
    getRowCanExpand: (row: Row<typeof features, SpecStat>) =>
      row.original.parses >= minParses && row.original.dungeons.length > 0,
    initialState: { sorting: [{ id: "median", desc: true }] },
  });

  // Row identity is spec-based and survives role/dungeon switches, so an open
  // row would otherwise stay marked expanded across a view change.
  useEffect(() => {
    table.resetExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, dungeon]);

  const sortBy = (table.state.sorting?.[0]?.id ?? "median") as SortKey;
  const setSort = (key: SortKey) => table.setSorting([{ id: key, desc: true }]);

  if (rows.length === 0) return null;

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
                {header.column.getIsSorted() ? (
                  <IconChevronDown size={10} stroke={2.5} className={classes.sortIcon} />
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
              className={`${classes.keyBtn} ${sortBy === o.key ? classes.keyBtnActive : ""}`}
              aria-pressed={sortBy === o.key}
              onClick={() => setSort(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {table.getRowModel().rows.map((row) => {
          const s = row.original;
          const low = s.parses < minParses;
          const isOpen = row.getIsExpanded();
          const canExpand = row.getCanExpand();
          return (
            <div key={row.id} className={`${classes.rowWrap} ${isOpen ? classes.rowOpen : ""}`}>
              <button
                type="button"
                className={`${classes.row} ${!canExpand ? classes.rowStatic : ""}`}
                onClick={canExpand ? row.getToggleExpandedHandler() : undefined}
                aria-expanded={canExpand ? isOpen : undefined}
                disabled={!canExpand}
              >
                {row.getAllCells().map((cell) => (
                  <Fragment key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Fragment>
                ))}
              </button>

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
          Rows sorted by {SORT_OPTIONS.find((o) => o.key === sortBy)?.label.toLowerCase() ?? "median"}.
          Click a spec for its per-dungeon split.
        </span>
      </div>
    </>
  );
}

const HEADER_TOOLTIP: Record<string, string> = {
  rank: "Position under the current sort. Specs with too few parses sit unranked at the bottom.",
  spec: "Class specialization. Colored by class; the icon is the spec.",
  bar: "Solid bar = median, pale tail = up to the top 5%, hollow marker = single best parse. Axis starts at zero and tops out just above the role's best parse.",
  median:
    "Typical throughput across the spec's sampled runs, adjusted for dungeon and key mix — it will not match any single log. Click to rank by it.",
  p95: "What the spec does when played well: the top-5% cutoff of its sampled runs, adjusted for dungeon and key mix. Click to rank by it.",
  max: "The single best raw parse in the sample — a real, findable log. Click to rank by it, then expand a row to open the run on WarcraftLogs.",
  typicalKey: "Typical key level of this spec's sampled runs — where its fastest runs actually happen.",
};

const HEADER_CLASS: Record<string, string> = {
  rank: classes.colRank!,
  spec: classes.colSpec!,
  bar: classes.colBar!,
  typicalKey: classes.keyCol!,
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
  const detail = spec.dungeons.map((d) => ({
    ...d,
    name: dungeonNames.get(d.encounterId) ?? `Dungeon ${d.encounterId}`,
    value: d[sortBy],
  }));
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
