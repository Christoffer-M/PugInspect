import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Box,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconSearch,
  IconSparkles,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { Page } from "../components/layout/Page";
import { useSiteStats, type SiteStats } from "../queries/site-stats";
import { getClassColor } from "../util/util";
import classes from "./stats.module.css";

const REGION_LABELS: Record<string, string> = {
  eu: "Europe (EU)",
  us: "Americas (US)",
  kr: "Korea (KR)",
  tw: "Taiwan (TW)",
  cn: "China (CN)",
};

const REGION_COLORS = ["#8b7cf6", "#22d3ee", "#4ade80", "#fb923c", "#f472b6"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Last 14 UTC days, zero-filled from the sparse per-day counts. */
function fillDays(perDay: SiteStats["searchesPerDay"]) {
  const byDate = new Map(perDay.map((d) => [d.date, d.count]));
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    return { key, day: String(date.getUTCDate()), count: byDate.get(key) ?? 0 };
  });
}

const HeroCard: React.FC<{
  label: string;
  value: string | undefined;
  sub: React.ReactNode;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, sub, color, icon }) => (
  <Paper p="lg" radius="md" className={classes.heroCard} style={{ "--card-accent": color } as React.CSSProperties}>
    <Group justify="space-between">
      <Text size="xs" m={0} tt="uppercase" fw={500} c="dimmed" style={{ letterSpacing: 1.5 }}>
        {label}
      </Text>
      <Box c={color} display="flex">
        {icon}
      </Box>
    </Group>
    {value === undefined ? (
      <Skeleton height={36} mt={12} width="60%" />
    ) : (
      <Text className={classes.heroValue} mb={0} style={{ color }}>
        {value}
      </Text>
    )}
    <Text size="sm" c="dimmed" mt={6} mb={0}>
      {sub}
    </Text>
  </Paper>
);

const CardTitle: React.FC<{ title: string; right?: string }> = ({ title, right }) => (
  <Group justify="space-between" align="baseline">
    <Title order={3} m={0} fz={18}>
      {title}
    </Title>
    {right && (
      <Text size="xs" m={0} c="dimmed">
        {right}
      </Text>
    )}
  </Group>
);

const CharacterLink: React.FC<{ name: string; realm: string; region: string; class?: string | null }> = (c) => (
  <Text
    component={Link}
    to={`/${c.region.toLowerCase()}/${c.realm.toLowerCase()}/${c.name.toLowerCase()}`}
    fw={600}
    fz={14.5}
    m={0}
    truncate
    style={{ color: getClassColor(c.class) }}
  >
    {capitalize(c.name)}
  </Text>
);

const EmptyRows: React.FC = () => (
  <Text size="sm" c="dimmed" px="lg" py="md">
    No searches recorded yet — data starts accruing now.
  </Text>
);

const Stats: React.FC = () => {
  const { data } = useSiteStats();

  const days = fillDays(data?.searchesPerDay ?? []);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const totalRegionCount = Math.max(1, ...[data?.regionBreakdown.reduce((s, r) => s + r.count, 0) ?? 0]);
  const totalClassCount = Math.max(1, data?.classDistribution.reduce((s, c) => s + c.count, 0) ?? 0);
  const searchDelta =
    data && data.searchesYesterday > 0
      ? `${data.searchesToday >= data.searchesYesterday ? "+" : ""}${Math.round(((data.searchesToday - data.searchesYesterday) / data.searchesYesterday) * 100)}%`
      : null;

  return (
    <Page>
      <Container size={1180} px="md">
        <Box pt="xl" pb="lg">
          <Group align="baseline" gap="md">
            <Title order={1} m={0}>
              Stats
            </Title>
            <Text size="sm" c="dimmed">
              Live overview of everything PugInspect is tracking
            </Text>
          </Group>
          <Group gap={8} mt={10}>
            <span className={classes.liveDot} />
            <Text size="xs" c="dimmed">
              Live · syncing every 60s
            </Text>
          </Group>
        </Box>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
          <HeroCard
            label="Total characters"
            value={data?.totalCharacters.toLocaleString()}
            color="#a78bfa"
            icon={<IconUsers size={18} stroke={2} />}
            sub={
              <>
                <Text span c="#4ade80" fw={600} inherit>
                  +{(data?.newCharactersThisWeek ?? 0).toLocaleString()}
                </Text>{" "}
                this week
              </>
            }
          />
          <HeroCard
            label="Searches today"
            value={data?.searchesToday.toLocaleString()}
            color="#22d3ee"
            icon={<IconSearch size={18} stroke={2} />}
            sub={
              searchDelta ? (
                <>
                  <Text span c={searchDelta.startsWith("-") ? "#f87171" : "#4ade80"} fw={600} inherit>
                    {searchDelta}
                  </Text>{" "}
                  vs. yesterday
                </>
              ) : (
                "character lookups"
              )
            }
          />
          <HeroCard
            label="New this week"
            value={data?.newCharactersThisWeek.toLocaleString()}
            color="#4ade80"
            icon={<IconSparkles size={18} stroke={2} />}
            sub="new profiles"
          />
          <HeroCard
            label="Realms tracked"
            value={data?.realmsTracked.toLocaleString()}
            color="#fb923c"
            icon={<IconWorld size={18} stroke={2} />}
            sub={`across ${data?.regionBreakdown.length ?? 0} regions`}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md" style={{ gridTemplateColumns: undefined }}>
          <Paper p="lg" radius="md" className={classes.chartCard}>
            <CardTitle title="Searches over time" right="last 14 days" />
            <Text size="sm" c="dimmed" mb="lg">
              Character lookups per day
            </Text>
            <div className={classes.chart}>
              {days.map((d) => (
                <div key={d.key} className={classes.chartCol}>
                  <span className={classes.chartValue}>{d.count > 0 ? d.count.toLocaleString() : ""}</span>
                  <div
                    className={classes.chartBar}
                    style={{
                      height: d.count > 0 ? `${28 + (d.count / maxDay) * 72}%` : "2px",
                      opacity: 0.55 + (d.count / maxDay) * 0.45,
                    }}
                  />
                  <span className={classes.chartDay}>{d.day}</span>
                </div>
              ))}
            </div>
          </Paper>

          <Paper p="lg" radius="md">
            <CardTitle title="By region" />
            <Text size="sm" c="dimmed" mb="lg">
              Share of tracked characters
            </Text>
            <Stack gap="md">
              {data?.regionBreakdown.map((r, i) => {
                const pct = (r.count / totalRegionCount) * 100;
                const color = REGION_COLORS[i % REGION_COLORS.length];
                return (
                  <div key={r.region}>
                    <Group justify="space-between" mb={6}>
                      <Text size="sm" m={0} fw={600}>
                        {REGION_LABELS[r.region] ?? r.region.toUpperCase()}
                      </Text>
                      <Text size="sm" m={0} c="dimmed">
                        {r.count.toLocaleString()} ·{" "}
                        <Text span fw={600} inherit style={{ color }}>
                          {pct.toFixed(1)}%
                        </Text>
                      </Text>
                    </Group>
                    <div className={classes.regionTrack}>
                      <div className={classes.regionFill} style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </Stack>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
          <Paper radius="md" py="xs" px={0}>
            <Box px="lg" py="sm">
              <CardTitle title="Recent searches" right="latest 10" />
            </Box>
            {data && data.recentSearches.length === 0 && <EmptyRows />}
            {data?.recentSearches.map((c, i) => (
              <Group key={`${c.name}-${c.searchedAt}-${i}`} gap="sm" px="lg" py={10} className={classes.row} wrap="nowrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <CharacterLink {...c} />
                  <Text size="xs" m={0} c="dimmed">
                    {capitalize(c.realm)}
                    {c.specialization && c.class ? ` · ${c.specialization} ${c.class}` : ""}
                  </Text>
                </Box>
                <span className={classes.regionBadge}>{c.region.toUpperCase()}</span>
                <Text size="xs" m={0} c="dimmed" w={60} ta="right" style={{ flexShrink: 0 }}>
                  {timeAgo(c.searchedAt)}
                </Text>
              </Group>
            ))}
          </Paper>

          <Paper radius="md" py="xs" px={0}>
            <Box px="lg" py="sm">
              <CardTitle title="Trending this week" right="most searched" />
            </Box>
            {data && data.trendingCharacters.length === 0 && <EmptyRows />}
            {data?.trendingCharacters.map((t, i) => (
              <Group key={`${t.name}-${t.realm}`} gap="md" px="lg" py={10} className={classes.row} wrap="nowrap">
                <Text className={classes.rank} m={0}>{String(i + 1).padStart(2, "0")}</Text>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <CharacterLink {...t} />
                  <Text size="xs" m={0} c="dimmed">
                    {capitalize(t.realm)} · {t.region.toUpperCase()}
                  </Text>
                </Box>
                <Text size="sm" m={0} fw={600} style={{ flexShrink: 0 }}>
                  {t.searches.toLocaleString()}
                </Text>
              </Group>
            ))}
          </Paper>
        </SimpleGrid>

        <Paper p="lg" radius="md" mt="md">
          <Group justify="space-between" align="baseline" mb="lg">
            <Title order={3} m={0} fz={18}>
              Class distribution
            </Title>
            <Text size="sm" c="dimmed">
              of {(data?.totalCharacters ?? 0).toLocaleString()} tracked characters
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
            {data?.classDistribution.map((cl) => (
              <Group key={cl.class} gap={10} wrap="nowrap">
                <span className={classes.classSwatch} style={{ background: getClassColor(cl.class) }} />
                <Text size="sm" m={0} style={{ flex: 1 }} truncate>
                  {cl.class}
                </Text>
                <Text size="sm" m={0} fw={600}>
                  {((cl.count / totalClassCount) * 100).toFixed(1)}%
                </Text>
              </Group>
            ))}
          </SimpleGrid>
        </Paper>
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [{ title: "PugInspect - Stats" }],
    links: [{ rel: "canonical", href: "https://puginspect.com/stats" }],
  }),
  component: Stats,
});
