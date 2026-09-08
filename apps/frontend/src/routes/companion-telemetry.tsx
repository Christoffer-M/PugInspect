import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { BarChart, LineChart } from "@mantine/charts";
import { useLocalStorage } from "@mantine/hooks";
import { SectionTitle, getRegionColor } from "@repo/ui";
import { Page } from "../components/layout/Page";
import {
  CompanionTelemetry,
  useCompanionTelemetry,
} from "../queries/companion-telemetry";
import classes from "./companion-telemetry.module.css";

const GREEN = "#22c55e";
const AMBER = "#f4a50e";
const RED = "#f87171";
const ACCENT = "#8b7fd4";

/** no_window and lost are the game's fault; the rest are ours to ship a fix for. */
const linkColor = (link?: string | null) =>
  link === "ok"
    ? GREEN
    : link === "no_window" || link === "lost"
      ? AMBER
      : link
        ? RED
        : "dimmed";
/** Newest build is fine, one behind is worth watching, older is stuck. */
const versionColor = (index: number) =>
  index === 0 ? ACCENT : index === 1 ? AMBER : RED;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** Everything is UTC — beats carry no local time, so a local render would be a lie. */
const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const dayTime = (iso: string) => {
  const d = new Date(iso);
  return `${day(iso)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
/** "11–17 Aug" within a month, "28 Aug–3 Sep" across one. */
const range = (from: string, to: string) => {
  const a = new Date(from);
  return a.getUTCMonth() === new Date(to).getUTCMonth()
    ? `${a.getUTCDate()}–${day(to)}`
    : `${day(from)}–${day(to)}`;
};
const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);

const BarRow: React.FC<{
  label: React.ReactNode;
  color: string;
  percent: number;
  value: React.ReactNode;
  labelWidth?: number;
}> = ({ label, color, percent, value, labelWidth = 108 }) => (
  <Group gap="sm" wrap="nowrap">
    <Text
      size="xs"
      className={classes.mono}
      c={color}
      w={labelWidth}
      style={{ flexShrink: 0 }}
      truncate
    >
      {label}
    </Text>
    <Box className={classes.track} flex={1}>
      <Box className={classes.fill} w={`${percent}%`} bg={color} />
    </Box>
    <Text
      size="xs"
      className={classes.mono}
      c="dimmed"
      ta="right"
      w={96}
      style={{ flexShrink: 0 }}
    >
      {value}
    </Text>
  </Group>
);

const FunnelStep: React.FC<{
  label: string;
  value: number;
  color?: string;
  aside?: string;
  sub: string;
}> = ({ label, value, color, aside, sub }) => (
  <Paper p="md" radius="md" withBorder>
    <Text
      size="xs"
      tt="uppercase"
      c="dimmed"
      fw={500}
      style={{ letterSpacing: 1 }}
    >
      {label}
    </Text>
    <Group gap={8} align="baseline" mt={6}>
      <Text className={classes.metric} style={color ? { color } : undefined}>
        {value}
      </Text>
      {aside && (
        <Text size="sm" className={classes.mono} c="dimmed">
          {aside}
        </Text>
      )}
    </Group>
    <Text size="sm" c="dimmed" mt={6}>
      {sub}
    </Text>
  </Paper>
);

const Panel: React.FC<{
  title: string;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, right, footer, children }) => (
  <Paper p="lg" radius="md" withBorder h="100%">
    <Stack gap="md" h="100%">
      <SectionTitle order={3} right={right}>
        {title}
      </SectionTitle>
      {children}
      {footer && (
        <Text
          size="xs"
          c="dimmed"
          mt="auto"
          pt="xs"
          style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}
        >
          {footer}
        </Text>
      )}
    </Stack>
  </Paper>
);

const Dashboard: React.FC<{ data: CompanionTelemetry }> = ({ data }) => {
  const maxLink = Math.max(1, ...data.links.map((l) => l.beats));
  const maxVersion = Math.max(1, ...data.versions.map((v) => v.count));
  const maxRegion = Math.max(1, ...data.regions.map((r) => r.count));
  const lookupOk =
    data.lookups.total - data.lookups.notFound - data.lookups.errors;
  const strandedTotal = data.stranded.reduce((n, g) => n + g.installs, 0);
  const completeCohorts = data.cohorts.filter((c) => !c.pending);
  const newestCohort = data.cohorts.find((c) => c.pending);
  const capPercent = Math.round(pct(data.cap.beats, data.beatsThisWeek));

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Panel title="Activation funnel">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <FunnelStep
              label="Installs"
              value={data.funnel.installs}
              sub="all-time"
            />
            <FunnelStep
              label="Ever activated"
              value={data.funnel.activated}
              color={GREEN}
              aside={`${Math.round(pct(data.funnel.activated, data.funnel.installs))}%`}
              sub="read the game at least once"
            />
            <FunnelStep
              label="Active this week"
              value={data.funnel.activeThisWeek}
              aside={`of ${data.funnel.activated}`}
              sub="activated and seen in the last 7 days"
            />
          </SimpleGrid>
          {data.funnel.never > 0 && (
            <Alert color="red" variant="light" title="Never got it working">
              <Group gap="md" align="center" wrap="nowrap">
                <Text className={classes.metric} c={RED}>
                  {data.funnel.never}
                </Text>
                <Text size="sm">
                  {data.funnel.never} of {data.funnel.installs} installs have{" "}
                  <span className={classes.mono}>activated_at IS NULL</span> —
                  they ran the app but never read a single applicant.
                  {data.funnel.neverNoWindow > 0 && (
                    <>
                      {" "}
                      {data.funnel.neverNoWindow} of them last reported{" "}
                      <span className={classes.mono}>no_window</span>, which is
                      the strip never being enabled with{" "}
                      <span className={classes.mono}>/pi hud</span>.
                    </>
                  )}
                </Text>
              </Group>
            </Alert>
          )}
        </Panel>

        <Panel
          title="Why capture fails"
          right={
            <Text size="xs" c="dimmed">
              {data.beatsThisWeek.toLocaleString()} beats · 7 days
            </Text>
          }
          footer={
            <>
              <Text span c={AMBER} inherit>
                no_window
              </Text>{" "}
              is a game-not-running problem.{" "}
              <Text span c={RED} inherit>
                addon_outdated / incompatible
              </Text>{" "}
              is a version mismatch you can fix by shipping.{" "}
              <Text span c={AMBER} inherit>
                lost
              </Text>{" "}
              broke mid-session.
            </>
          }
        >
          <Stack gap="sm">
            {data.links.map((l) => (
              <BarRow
                key={l.link}
                label={l.link}
                color={l.beats === 0 ? "dimmed" : linkColor(l.link)}
                percent={pct(l.beats, maxLink)}
                value={
                  l.beats
                    ? `${l.beats.toLocaleString()} · ${l.installs} inst`
                    : "0"
                }
              />
            ))}
          </Stack>
        </Panel>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Panel
          title={`Installs over ${data.windowDays} days`}
          right={
            <Text size="xs" className={classes.mono} c="dimmed">
              +{data.newThisWindow} new · {data.funnel.installs} total
            </Text>
          }
          footer="One step per install. Read the steps, not a curve."
        >
          {/* LineChart, not AreaChart: Mantine wraps AreaChart's series in a
              Fragment for the gradient defs, and recharts 2 under React 19
              doesn't find fragment-wrapped children, so nothing draws. */}
          <LineChart
            h={170}
            data={data.growth.map((p) => ({
              date: day(p.date),
              installs: p.count,
            }))}
            dataKey="date"
            series={[{ name: "installs", color: "accent.5" }]}
            curveType="step"
            withDots={false}
            gridAxis="xy"
            tickLine="none"
            xAxisProps={{ interval: "preserveStartEnd", minTickGap: 40 }}
            yAxisProps={{ allowDecimals: false }}
          />
        </Panel>

        <Panel
          title="Versions & stranded installs"
          footer="A successful update relaunches the app, so success is never reported. Pending and failed states are all this table can see."
        >
          <Stack gap="sm">
            {data.versions.map((v, i) => (
              <BarRow
                key={v.version}
                label={v.version}
                color={versionColor(i)}
                percent={pct(v.count, maxVersion)}
                value={v.count}
                labelWidth={56}
              />
            ))}
          </Stack>
          {strandedTotal > 0 && (
            <Alert color="yellow" variant="light">
              <Group gap={8} align="baseline">
                <Text className={classes.mono} fz={26} fw={600} c={AMBER}>
                  {strandedTotal}
                </Text>
                <Text size="sm" fw={600}>
                  stranded on an old build
                </Text>
              </Group>
              <Stack gap={4} mt={8}>
                {data.stranded.map((g) => (
                  <Text
                    key={`${g.from}-${g.to}`}
                    size="xs"
                    className={classes.mono}
                  >
                    {g.from} → pending {g.to} · {g.installs} install
                    {g.installs === 1 ? "" : "s"}
                    {g.failures > 0 && ` · ${g.failures} update_failures`}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}
        </Panel>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
        <Panel
          title="Do they come back"
          right={
            <Text size="xs" c="dimmed">
              weekly cohorts
            </Text>
          }
        >
          <Table
            verticalSpacing={6}
            horizontalSpacing={0}
            withRowBorders={false}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Text size="xs" tt="uppercase" c="dimmed">
                    Cohort
                  </Text>
                </Table.Th>
                <Table.Th ta="right">
                  <Text size="xs" tt="uppercase" c="dimmed">
                    Day 1
                  </Text>
                </Table.Th>
                <Table.Th ta="right">
                  <Text size="xs" tt="uppercase" c="dimmed">
                    Day 7
                  </Text>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {completeCohorts.map((c) => {
                const cell = (n: number) => (
                  <Table.Td ta="right">
                    <Text
                      size="sm"
                      className={classes.mono}
                      c={!c.size ? "dimmed" : n / c.size >= 0.5 ? GREEN : AMBER}
                    >
                      {c.size ? `${n} of ${c.size}` : "—"}
                    </Text>
                  </Table.Td>
                );
                return (
                  <Table.Tr key={c.start}>
                    <Table.Td>
                      <Text size="sm" className={classes.mono} c="dimmed">
                        {range(c.start, c.end)} · {c.size}
                      </Text>
                    </Table.Td>
                    {cell(c.day1)}
                    {cell(c.day7)}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          {newestCohort && (
            <Group
              className={classes.pendingCohort}
              p="md"
              gap="md"
              wrap="nowrap"
              align="center"
            >
              <Box style={{ flexShrink: 0 }}>
                <Text
                  size="sm"
                  className={classes.mono}
                  c="dimmed"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {range(newestCohort.start, newestCohort.end)} ·{" "}
                  {newestCohort.size}
                </Text>
                <Text size="xs" c="dimmed">
                  day 1:{" "}
                  {newestCohort.size
                    ? `${newestCohort.day1} of ${newestCohort.size}`
                    : "—"}
                </Text>
              </Box>
              <Box>
                <Text className={classes.mono} c="dimmed">
                  day 7 — not yet
                </Text>
                <Text size="xs" c="dimmed">
                  {newestCohort.size
                    ? `the newest cohort needs ${newestCohort.daysToWait} more day${newestCohort.daysToWait === 1 ? "" : "s"} before this cell means anything`
                    : "no installs joined this week"}
                </Text>
              </Box>
            </Group>
          )}
        </Panel>

        <Panel
          title="Runtime"
          right={
            <Text size="xs" className={classes.mono} c="dimmed">
              {data.runtimeBeats.toLocaleString()} beats · 14 d
            </Text>
          }
          footer="Buckets of 30 minutes, inferred from consecutive beats. A run shorter than one beat reports nothing at all."
        >
          <BarChart
            h={120}
            data={data.runtime.map((p) => ({
              date: day(p.date),
              beats: p.count,
            }))}
            dataKey="date"
            series={[{ name: "beats", color: "accent.5" }]}
            gridAxis="y"
            tickLine="none"
            xAxisProps={{ interval: "preserveStartEnd", minTickGap: 24 }}
            yAxisProps={{ allowDecimals: false }}
          />
          <Text
            size="xs"
            tt="uppercase"
            c="dimmed"
            style={{ letterSpacing: 1 }}
          >
            Inferred session length
          </Text>
          <Stack gap="sm">
            {data.sessions.map((s) => (
              <BarRow
                key={s.bucket}
                label={s.bucket}
                color={ACCENT}
                percent={s.percent}
                value={`${s.percent}%`}
                labelWidth={64}
              />
            ))}
          </Stack>
        </Panel>

        <Stack gap="md">
          <Panel
            title="Lookup health · 7 d"
            footer="Deltas since each install's previous report, summed. Not lifetime totals."
          >
            <Group gap={8} align="baseline">
              <Text className={classes.mono} fz={30} fw={600}>
                {data.lookups.total.toLocaleString()}
              </Text>
              <Text size="sm" c="dimmed">
                characters looked up
              </Text>
            </Group>
            <Box className={classes.split}>
              <Box w={`${pct(lookupOk, data.lookups.total)}%`} bg={GREEN} />
              <Box
                w={`${pct(data.lookups.notFound, data.lookups.total)}%`}
                bg={AMBER}
              />
              <Box
                w={`${pct(data.lookups.errors, data.lookups.total)}%`}
                bg={RED}
              />
            </Box>
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="xs" className={classes.mono} c={AMBER}>
                  not_found
                </Text>
                <Text size="xs" className={classes.mono} c="dimmed">
                  {data.lookups.notFound.toLocaleString()} ·{" "}
                  {pct(data.lookups.notFound, data.lookups.total).toFixed(1)}%
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" className={classes.mono} c={RED}>
                  lookup_errors
                </Text>
                <Text size="xs" className={classes.mono} c="dimmed">
                  {data.lookups.errors.toLocaleString()} ·{" "}
                  {pct(data.lookups.errors, data.lookups.total).toFixed(1)}%
                </Text>
              </Group>
            </Stack>
          </Panel>

          <Panel title={`${data.cap.limit}-applicant cap`}>
            <Group gap={8} align="baseline">
              <Text className={classes.mono} fz={30} fw={600} c={AMBER}>
                {capPercent}%
              </Text>
              <Text size="sm" c="dimmed">
                of beats hit the cap
              </Text>
            </Group>
            <Text size="xs" className={classes.mono} c="dimmed">
              {data.cap.beats.toLocaleString()} of{" "}
              {data.beatsThisWeek.toLocaleString()} beats · {data.cap.installs}{" "}
              of {data.funnel.installs} installs
            </Text>
            <Text size="xs" c="dimmed">
              Highest <span className={classes.mono}>total</span> seen while
              capped at {data.cap.limit}:{" "}
              <span className={classes.mono}>{data.cap.maxTotal}</span>.
            </Text>
          </Panel>
        </Stack>
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Panel
            title="Every install"
            right={
              <Text size="xs" c="dimmed">
                {data.installs.length} rows · newest first · no names or
                characters exist in this data
              </Text>
            }
            footer="Region is the WoW region of the last listing, not where anyone lives."
          >
            <Table.ScrollContainer minWidth={720}>
              <Table verticalSpacing={8} className={classes.mono} fz="xs">
                <Table.Thead>
                  <Table.Tr>
                    {[
                      "install",
                      "first seen",
                      "last seen",
                      "version",
                      "region",
                      "activated",
                      "last link state",
                    ].map((h) => (
                      <Table.Th key={h}>
                        <Text size="xs" tt="uppercase" c="dimmed" fw={500}>
                          {h}
                        </Text>
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.installs.map((r) => (
                    <Table.Tr key={r.installId + r.firstSeen}>
                      <Table.Td>{r.installId}…</Table.Td>
                      <Table.Td>{day(r.firstSeen)}</Table.Td>
                      <Table.Td
                        c={
                          new Date(r.lastSeen).getTime() <
                          Date.now() - 7 * 86_400_000
                            ? "dimmed"
                            : undefined
                        }
                      >
                        {dayTime(r.lastSeen)}
                      </Table.Td>
                      <Table.Td
                        c={versionColor(
                          data.versions.findIndex(
                            (v) => v.version === r.version,
                          ),
                        )}
                      >
                        {r.version}
                      </Table.Td>
                      <Table.Td c={getRegionColor(r.region)}>
                        {r.region ?? "—"} · {r.country ?? "—"}
                      </Table.Td>
                      <Table.Td c={r.activatedAt ? GREEN : RED}>
                        {r.activatedAt ? day(r.activatedAt) : "never"}
                      </Table.Td>
                      <Table.Td c={linkColor(r.link)}>{r.link ?? "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Panel>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Panel
            title="Regions"
            footer={`${data.countries.length} countries across ${data.funnel.installs} installs.`}
          >
            <Stack gap="sm">
              {data.regions.map((r) => (
                <BarRow
                  key={r.region}
                  label={r.region}
                  color={
                    r.region === "null" ? "dimmed" : getRegionColor(r.region)
                  }
                  percent={pct(r.count, maxRegion)}
                  value={r.count}
                  labelWidth={44}
                />
              ))}
            </Stack>
            <Text
              size="xs"
              tt="uppercase"
              c="dimmed"
              style={{ letterSpacing: 1 }}
            >
              Countries · edge-derived
            </Text>
            <Group gap={6}>
              {data.countries.map((c) => (
                <Badge
                  key={c.country}
                  variant="default"
                  className={classes.mono}
                  radius="sm"
                >
                  {c.country}
                  {c.count > 1 ? ` ${c.count}` : ""}
                </Badge>
              ))}
            </Group>
          </Panel>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

/** The token is held in localStorage so a reload doesn't re-prompt. It is the
 *  only credential the page has — no session, no logout beyond clearing it. */
const TokenPrompt: React.FC<{
  onSubmit: (token: string) => void;
  error?: boolean;
}> = ({ onSubmit, error }) => {
  const [value, setValue] = useState("");
  return (
    <Paper
      p="xl"
      radius="md"
      withBorder
      maw={420}
      mx="auto"
      mt={80}
      component="form"
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <Stack gap="md">
        <Title order={2}>Companion telemetry</Title>
        <Text size="sm" c="dimmed">
          Internal. Enter the telemetry token to continue.
        </Text>
        <PasswordInput
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          label="Token"
          autoFocus
          error={error ? "That token was rejected" : undefined}
        />
        <Button type="submit" disabled={!value.trim()}>
          Unlock
        </Button>
      </Stack>
    </Paper>
  );
};

const CompanionTelemetryPage: React.FC = () => {
  const [token, setToken] = useLocalStorage({
    key: "companion-telemetry-token",
    defaultValue: "",
  });
  const { data, isLoading, isError } = useCompanionTelemetry(token);

  return (
    <Page>
      <Container size={1440} px="md" pb="xl">
        {!token || isError ? (
          <TokenPrompt onSubmit={setToken} error={isError} />
        ) : (
          <>
            <Group
              justify="space-between"
              align="flex-end"
              pt="xl"
              pb="lg"
              wrap="wrap"
            >
              <Box>
                <Title order={1} m={0}>
                  Companion telemetry
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Internal · anonymous install reports, 30-minute heartbeats
                </Text>
              </Box>
              <Group gap="xl" align="flex-end">
                <Box>
                  <Text
                    size="xs"
                    tt="uppercase"
                    c="dimmed"
                    style={{ letterSpacing: 1 }}
                  >
                    Window
                  </Text>
                  <Text size="sm" className={classes.mono}>
                    Last {data?.windowDays ?? 30} days
                  </Text>
                </Box>
                <Box>
                  <Text
                    size="xs"
                    tt="uppercase"
                    c="dimmed"
                    style={{ letterSpacing: 1 }}
                  >
                    Newest report
                  </Text>
                  <Text size="sm" className={classes.mono}>
                    {data?.newestReport
                      ? `${dayTime(data.newestReport)} UTC`
                      : "—"}
                  </Text>
                </Box>
                <Button variant="subtle" size="xs" onClick={() => setToken("")}>
                  Lock
                </Button>
              </Group>
            </Group>
            {isLoading || !data ? (
              <Skeleton height={640} radius="md" />
            ) : (
              <Dashboard data={data} />
            )}
          </>
        )}
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/companion-telemetry")({
  component: CompanionTelemetryPage,
});
