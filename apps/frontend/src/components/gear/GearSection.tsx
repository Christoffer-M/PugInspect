import {
  Button,
  Collapse,
  Group,
  Paper,
  Skeleton,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Gear } from "../../graphql/graphql";
import { getTierNumber } from "../../data/tierSets";
import { GearItemTile } from "./GearItemTile";
import classes from "./GearSection.module.css";

// SEASON-CONFIG: current max level (Midnight era). Leveling characters get
// no enchant/gem warnings — incomplete gear is expected while leveling.
const MAX_LEVEL = 90;

// Distinct hue per tier so mixed loadouts (e.g. 2pc T35 + 2pc T36) read at a
// glance. Keyed by tier number, so a tier keeps its color on every character
// (T34 → purple, T35 → gold, T36 → cyan, then the palette cycles).
const TIER_COLORS = ["#5ac8e6", "#c98af0", "#e6b450"];
const getTierColor = (tier: number) => TIER_COLORS[tier % TIER_COLORS.length]!;

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
  // Only real raid tier sets — ignore crafted/PvP/legacy item sets the API also
  // reports. Newest tier first.
  const tierSets = (gear?.tierSets ?? [])
    .flatMap((ts) => {
      const tier = getTierNumber(ts.id);
      return tier != null ? [{ ...ts, tier }] : [];
    })
    .sort((a, b) => b.tier - a.tier);
  const tierColorById = new Map(
    tierSets.map((ts) => [ts.id, getTierColor(ts.tier)]),
  );

  const missingEnchants = items.filter((i) => i.missingEnchant).length;
  const emptySockets = items.reduce(
    (sum, i) => sum + i.sockets.filter((s) => !s.filled).length,
    0,
  );
  const issueParts = [
    ...(missingEnchants > 0
      ? [
          `${missingEnchants} missing enchant${missingEnchants === 1 ? "" : "s"}`,
        ]
      : []),
    ...(emptySockets > 0
      ? [`${emptySockets} empty socket${emptySockets === 1 ? "" : "s"}`]
      : []),
  ];
  const isMaxLevel = level != null && level >= MAX_LEVEL;

  if (isLoading) {
    // Skeleton heights match the loaded strip (tallest stat block ≈ 56px) so
    // the card doesn't jump when data lands.
    return (
      <Paper shadow="xs" radius="md" p="md" withBorder>
        <Group gap={20}>
          <Skeleton height={56} width={70} animate={!isError} />
          <Skeleton height={56} width={160} animate={!isError} />
          <Skeleton height={56} width={140} animate={!isError} />
          <Skeleton height={30} width={110} ml="auto" animate={!isError} />
        </Group>
      </Paper>
    );
  }

  if (!gear || items.length === 0) {
    return (
      <Paper shadow="xs" radius="md" p="md" withBorder>
        <Text size="sm" c="dimmed">
          {isError ? "Couldn't load gear — try refreshing" : "Gear unavailable"}
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
          <div className={classes.statContent}>
            {isLoadingInfo ? (
              <Skeleton height={20} width={44} />
            ) : (
              <div className={classes.statVal}>
                {equippedItemLevel != null ? equippedItemLevel.toFixed(0) : "–"}
              </div>
            )}
          </div>
        </div>

        {tierSets.length > 0 && (
          <div className={`${classes.stat} ${classes.statDivided}`}>
            <div className={classes.statLabel}>Tier Set</div>
            <Group gap={7} className={classes.statContent}>
              {tierSets.map((ts) => {
                const color = tierColorById.get(ts.id)!;
                return (
                  <Tooltip key={ts.id} label={ts.name} withArrow>
                    <span className={classes.tierItem}>
                      <span className={classes.tierText} style={{ color }}>
                        T{ts.tier}
                      </span>
                      <span className={classes.tierCount}>
                        {ts.equippedCount} pc
                      </span>
                    </span>
                  </Tooltip>
                );
              })}
            </Group>
          </div>
        )}

        {isMaxLevel && (
          <div className={`${classes.stat} ${classes.statDivided}`}>
            <div className={classes.statLabel}>
              Gear Check
              {issueParts.length > 0 ? (
                <span
                  className={classes.gearCheckIcon}
                  style={{ color: "#f0983d" }}
                >
                  &#9888;
                </span>
              ) : (
                <span
                  className={classes.gearCheckIcon}
                  style={{ color: "#5fce7f" }}
                >
                  &#10003;
                </span>
              )}
            </div>
            <div className={classes.statContent}>
              {issueParts.length > 0 ? (
                <div className={classes.gearCheck} style={{ color: "#f0b878" }}>
                  {issueParts.map((part) => (
                    <div key={part}>{part}</div>
                  ))}
                </div>
              ) : (
                <div className={classes.gearCheck} style={{ color: "#5fce7f" }}>
                  Fully enchanted &amp; gemmed
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={toggle}
          size="compact-md"
          radius={7}
          className={classes.toggle}
          aria-expanded={opened}
          rightSection={
            <span aria-hidden style={{ fontSize: 11, opacity: 0.8 }}>
              {opened ? "⌃" : "⌄"}
            </span>
          }
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
                tierColor={
                  item.tierSetId != null
                    ? tierColorById.get(item.tierSetId)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </Collapse>
    </Paper>
  );
};
