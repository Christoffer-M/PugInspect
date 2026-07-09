import { Button, Collapse, Group, Paper, Skeleton, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Gear } from "../../graphql/graphql";
import { GearItemTile } from "./GearItemTile";
import classes from "./GearSection.module.css";

// SEASON-CONFIG: current max level (Midnight era). Leveling characters get
// no enchant/gem warnings — incomplete gear is expected while leveling.
const MAX_LEVEL = 90;

// Distinct hue per equipped tier set so mixed loadouts read at a glance.
const TIER_COLORS = ["#e6b450", "#5ac8e6", "#c98af0"];

type GearSectionProps = {
  gear: Gear | null | undefined;
  equippedItemLevel: number | null | undefined;
  level: number | null | undefined;
  isLoading: boolean;
  isLoadingInfo: boolean;
  isError: boolean;
};

export const GearSection: React.FC<GearSectionProps> = ({
  gear,
  equippedItemLevel,
  level,
  isLoading,
  isLoadingInfo,
  isError,
}) => {
  const [opened, { toggle }] = useDisclosure(false);

  const items = gear?.items ?? [];
  const tierSets = gear?.tierSets ?? [];
  const tierColorById = new Map(tierSets.map((ts, i) => [ts.id, TIER_COLORS[i % TIER_COLORS.length]!]));

  const missingEnchants = items.filter((i) => i.missingEnchant).length;
  const emptySockets = items.reduce(
    (sum, i) => sum + i.sockets.filter((s) => !s.filled).length,
    0
  );
  const issueParts = [
    ...(missingEnchants > 0
      ? [`${missingEnchants} missing enchant${missingEnchants === 1 ? "" : "s"}`]
      : []),
    ...(emptySockets > 0 ? [`${emptySockets} empty socket${emptySockets === 1 ? "" : "s"}`] : []),
  ];
  const isMaxLevel = level != null && level >= MAX_LEVEL;

  if (isLoading) {
    return (
      <Paper shadow="xs" radius="md" p="md" withBorder>
        <Group gap={20}>
          <Skeleton height={38} width={70} animate={!isError} />
          <Skeleton height={38} width={160} animate={!isError} />
          <Skeleton height={38} width={140} animate={!isError} />
        </Group>
      </Paper>
    );
  }

  if (!gear || items.length === 0) {
    return (
      <Paper shadow="xs" radius="md" p="md" withBorder>
        <Text size="sm" c="dimmed">
          Gear unavailable
        </Text>
      </Paper>
    );
  }

  return (
    <Paper shadow="xs" radius="md" p="md" withBorder>
      <div className={classes.strip}>
        <Text className={classes.title}>Gear</Text>

        <div className={classes.stat}>
          <div className={classes.statLabel}>Item Level</div>
          <div className={classes.statVal}>
            {isLoadingInfo ? (
              <Skeleton height={20} width={44} />
            ) : equippedItemLevel != null ? (
              equippedItemLevel.toFixed(0)
            ) : (
              "–"
            )}
          </div>
          <div className={classes.statSub}>equipped</div>
        </div>

        {tierSets.length > 0 && (
          <div className={`${classes.stat} ${classes.statDivided}`}>
            <div className={classes.statLabel}>Tier Set</div>
            <Group gap={7} mt={2}>
              {tierSets.map((ts) => {
                const color = tierColorById.get(ts.id)!;
                return (
                  <span
                    key={ts.id}
                    className={classes.tierPill}
                    style={{ borderColor: `${color}55`, background: `${color}1f` }}
                  >
                    <span className={classes.tierPillName} style={{ color }}>
                      {ts.name}
                    </span>
                    <span className={classes.tierPillCount}>{ts.equippedCount} pc</span>
                  </span>
                );
              })}
            </Group>
          </div>
        )}

        {isMaxLevel && (
          <div className={`${classes.stat} ${classes.statDivided}`}>
            <div className={classes.statLabel}>Gear Check</div>
            {issueParts.length > 0 ? (
              <div className={classes.gearCheck} style={{ color: "#f0b878" }}>
                <span style={{ color: "#f0983d", fontSize: 14, lineHeight: 1 }}>&#9888;</span>
                {issueParts.join("  ·  ")}
              </div>
            ) : (
              <div className={classes.gearCheck} style={{ color: "#5fce7f" }}>
                <span style={{ fontSize: 13, lineHeight: 1 }}>&#10003;</span>
                Fully enchanted &amp; gemmed
              </div>
            )}
          </div>
        )}

        <Button
          onClick={toggle}
          size="compact-md"
          radius={7}
          className={classes.toggle}
          rightSection={<span style={{ fontSize: 11, opacity: 0.8 }}>{opened ? "⌃" : "⌄"}</span>}
        >
          {opened ? "Hide items" : "Show items"}
        </Button>
      </div>

      <Collapse in={opened}>
        <div className={classes.gridWrap}>
          <div className={classes.grid}>
            {items.map((item) => (
              <GearItemTile
                key={item.slot}
                item={item}
                tierColor={item.tierSetId != null ? tierColorById.get(item.tierSetId) : undefined}
              />
            ))}
          </div>
        </div>
      </Collapse>
    </Paper>
  );
};
