import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Box, Container, Group, Select, Stack, Text, Title } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { Page } from "../components/layout/Page";
import { ROLES, SpecMetaTable, type Role } from "../components/spec-meta/SpecMetaTable";
import { useMythicPlusSpecStats } from "../queries/mythic-plus-spec-stats";
import {
  DEFAULT_MYTHIC_PLUS_SEASON,
  EXPANSION_DISPLAY_NAMES,
  MYTHIC_PLUS_SEASONS,
} from "../generated/seasonConfig";
import { timeAgo } from "../util/util";
import classes from "../components/spec-meta/SpecMeta.module.css";

// The crawler only refreshes the current season, so there is nothing to
// select — the page just states which season it is showing.
const CURRENT_SEASON = MYTHIC_PLUS_SEASONS[DEFAULT_MYTHIC_PLUS_SEASON];
const SEASON_LABEL = CURRENT_SEASON
  ? `${CURRENT_SEASON.displayName} · ${EXPANSION_DISPLAY_NAMES[CURRENT_SEASON.expansion] ?? ""}`.trim()
  : "";

/**
 * Parse-weighted 10th–90th percentile of the sample's typical key levels.
 * `keyLevels` alone spans every key seen at least once, which lets a single
 * outlier run (one +18) read as headline coverage.
 */
function typicalKeyRange(data: { specs: { dungeons: { medianKey: number; parses: number }[] }[] }) {
  const byKey = new Map<number, number>();
  let total = 0;
  for (const spec of data.specs) {
    for (const d of spec.dungeons) {
      byKey.set(d.medianKey, (byKey.get(d.medianKey) ?? 0) + d.parses);
      total += d.parses;
    }
  }
  if (total === 0) return null;
  const sorted = [...byKey.entries()].sort((a, b) => a[0] - b[0]);
  const at = (q: number) => {
    let cum = 0;
    for (const [key, parses] of sorted) {
      cum += parses;
      if (cum >= total * q) return key;
    }
    return sorted[sorted.length - 1]![0];
  };
  return { lo: at(0.1), hi: at(0.9) };
}

const MythicPlusMeta: React.FC = () => {
  const [role, setRole] = useState<Role>("DPS");
  const [dungeon, setDungeon] = useState<number | null>(null);

  const zoneId = CURRENT_SEASON?.zoneId;
  const { data, isPending, isError } = useMythicPlusSpecStats(zoneId);

  const roleCounts = (r: Role) => data?.specs.filter((s) => s.role === r).length ?? 0;
  const typical = data ? typicalKeyRange(data) : null;

  return (
    <Page>
      <Container size={960} px="md" py="xl">
        <Stack gap="md">
          <Group align="flex-end" justify="space-between" wrap="wrap" gap="sm">
            <Group align="stretch" gap="sm" wrap="nowrap">
              <Box
                w={3}
                style={{
                  borderRadius: 2,
                  background:
                    "linear-gradient(180deg, #c5bcf2 0%, #8b7fd4 60%, rgba(139,127,212,0.15) 100%)",
                }}
              />
              <Stack gap={4}>
                <Group gap="sm" align="center" wrap="wrap">
                  <Title order={1} size="26px">Mythic+ Spec Meta</Title>
                  <Text
                    component="span"
                    size="13px"
                    fw={600}
                    ff="var(--mantine-font-family-headings)"
                    style={{
                      color: "#c5bcf2",
                      background: "rgba(139, 127, 212, 0.12)",
                      border: "1px solid rgba(139, 127, 212, 0.4)",
                      borderRadius: 6,
                      padding: "3px 10px",
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                      lineHeight: 1.4,
                    }}
                  >
                    {SEASON_LABEL}
                  </Text>
                </Group>
                <Text size="13px" c="dimmed">
                  Every spec&apos;s fastest Mythic+ runs, ranked by throughput and adjusted for
                  the dungeons and keys they happen at.
                </Text>
              </Stack>
            </Group>

            <Group gap="xs">
              {data && data.dungeons.length > 1 && (
                <Select
                  data={[
                    { value: "all", label: "All dungeons" },
                    ...data.dungeons.map((d) => ({ value: String(d.encounterId), label: d.name })),
                  ]}
                  value={dungeon == null ? "all" : String(dungeon)}
                  onChange={(v) => setDungeon(v == null || v === "all" ? null : Number(v))}
                  allowDeselect={false}
                  size="xs"
                  w={190}
                  aria-label="Dungeon"
                />
              )}
            </Group>
          </Group>

          {data && (
            <div className={classes.panel}>
              <div className={classes.provGrid}>
                <div className={classes.provCell}>
                  <span className={classes.provLabel}>Typical keys</span>
                  <span className={classes.provValue}>
                    {typical ? `${typical.lo}–${typical.hi}` : "—"}
                  </span>
                </div>
                <div className={classes.provCell}>
                  <span className={classes.provLabel}>Parses</span>
                  <span className={classes.provValue}>{data.totalParses.toLocaleString("en-US")}</span>
                </div>
                <div className={classes.provCell}>
                  <span className={classes.provLabel}>Last refresh</span>
                  <span className={classes.provFresh}>
                    <span className={classes.dot} />
                    {timeAgo(data.refreshedAt)}
                  </span>
                </div>
                <div className={classes.provCell}>
                  <span className={classes.provLabel}>Source</span>
                  <span className={classes.provValue}>Warcraft Logs</span>
                </div>
              </div>
              <div className={classes.provNote}>
                <span>
                  bar = median · pale extension = top 5% (both adjusted for dungeon &amp; key mix) ·
                  outline = best raw parse
                </span>
                <span className={classes.sep}>·</span>
                <span className={classes.provNoteDim}>
                  season to date · each spec&apos;s fastest {data.sampleDepth.toLocaleString("en-US")}{" "}
                  runs sampled per dungeon · runs from +{data.keyLevels[0]} to +
                  {data.keyLevels[data.keyLevels.length - 1]} seen
                </span>
              </div>
            </div>
          )}

          <div className={classes.tabs} role="tablist" aria-label="Role">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={role === r.id}
                className={`${classes.tab} ${role === r.id ? classes.tabActive : ""}`}
                onClick={() => setRole(r.id)}
              >
                <span>{r.label}</span>
                {data && <span className={classes.tabCount}>{roleCounts(r.id)}</span>}
              </button>
            ))}
          </div>

          {isPending && <LoadingRows />}
          {!isPending && (isError || !data) && <EmptyState />}
          {data && <SpecMetaTable data={data} role={role} dungeon={dungeon} />}
        </Stack>
      </Container>
    </Page>
  );
};

const LoadingRows: React.FC = () => (
  <div className={classes.panel}>
    {[72, 58, 84, 46, 66, 78, 52, 90].map((w, i) => (
      <div className={classes.skelRow} key={w}>
        <span className={classes.shimmer} style={{ width: 16, height: 10, animationDelay: `${i * 90}ms` }} />
        <span className={classes.shimmer} style={{ width: 24, height: 24, animationDelay: `${i * 90}ms` }} />
        <span className={classes.shimmer} style={{ width: w, height: 12, animationDelay: `${i * 90}ms` }} />
        <span style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 999, background: "rgba(201,209,224,0.07)", position: "relative", overflow: "hidden" }}>
          <span
            className={classes.shimmer}
            style={{ position: "absolute", inset: `0 auto 0 ${20 + i * 6}%`, width: `${Math.max(6, 26 - i * 3)}%`, borderRadius: 999, animationDelay: `${i * 90}ms` }}
          />
        </span>
        <span className={classes.shimmer} style={{ width: 42, height: 12, animationDelay: `${i * 90}ms` }} />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC = () => (
  <div className={classes.panel}>
    <div className={classes.empty}>
      <span className={classes.emptyIcon}><IconChartBar size={20} stroke={1.8} /></span>
      <Text fw={600} size="16px" ff="var(--mantine-font-family-headings)">No spec data yet</Text>
      <Text size="13px" c="dimmed" maw={320}>
        The season is young — there aren't enough completed runs at a single keystone level to
        rank specs fairly. Check back after the next reset.
      </Text>
    </div>
  </div>
);

export const Route = createFileRoute("/mythic-plus")({
  head: () => ({
    meta: [
      { title: "Mythic+ Spec Meta | PugInspect" },
      {
        name: "description",
        content:
          "Which Mythic+ specs are actually performing. Median, top 5% and best-parse DPS and HPS for all 40 specs, from Warcraft Logs, refreshed hourly.",
      },
    ],
    links: [{ rel: "canonical", href: "https://puginspect.com/mythic-plus" }],
  }),
  component: MythicPlusMeta,
});
