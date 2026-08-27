import { HoverCard, Text } from "@mantine/core";
import { GearItem } from "../../graphql/graphql";
import { getTierNumber } from "../../data/tierSets";
import { getQualityColor } from "../../util/util";
import classes from "./GearSection.module.css";

// Light quality colors need dark badge text (COMMON is literally white).
const LIGHT_QUALITIES = new Set(["COMMON", "UNCOMMON", "ARTIFACT", "HEIRLOOM"]);

// Shared with the gear-check chips in GearSection so pip, ring and chip match.
export const ENCHANT_COLOR = "#f0b429";
export const SOCKET_COLOR = "#e85a74";
const BOTH_COLOR = "#ff8a5c";

export const GearItemTile: React.FC<{ item: GearItem; tierColor?: string }> = ({
  item,
  tierColor,
}) => {
  const qualityColor = getQualityColor(item.quality);
  const badgeTextColor = LIGHT_QUALITIES.has(item.quality) ? "#060b16" : "#ffffff";
  // Only mark real raid tier pieces — crafted/PvP/legacy item sets don't count.
  const tierNumber = item.tierSetId != null ? getTierNumber(item.tierSetId) : null;

  // Flagged items get the issue color on the ring instead of the quality color —
  // a missing enchant/gem matters more at a glance than the item's rarity.
  const emptySockets = item.sockets.filter((s) => !s.filled).length;
  const flagColor = item.missingEnchant
    ? emptySockets > 0
      ? BOTH_COLOR
      : ENCHANT_COLOR
    : emptySockets > 0
      ? SOCKET_COLOR
      : null;

  return (
    <HoverCard width={260} shadow="md" withArrow openDelay={150} closeDelay={100}>
      <HoverCard.Target>
        <a
          className={classes.itemCol}
          href={`https://www.wowhead.com/item=${item.itemId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.name} on Wowhead`}
        >
          <div
            className={classes.tile}
            style={{
              borderColor: flagColor ?? qualityColor,
              boxShadow: flagColor
                ? `inset 0 0 0 1px rgba(0,0,0,0.45), 0 0 0 2px ${flagColor}55, 0 1px 3px rgba(0,0,0,0.5)`
                : undefined,
            }}
          >
            {item.iconUrl && (
              <img src={item.iconUrl} alt={item.name} className={classes.tileIcon} loading="lazy" />
            )}
            {tierNumber != null && (
              <div className={classes.tierMarker} style={{ background: tierColor }}>
                T
              </div>
            )}
          </div>
          {/* Issue bar sits on the card background, clear of every icon —
              amber = missing enchant, rose = empty socket, both = two halves. */}
          <div className={classes.flagBar}>
            {item.missingEnchant && (
              <span style={{ background: ENCHANT_COLOR }} />
            )}
            {emptySockets > 0 && <span style={{ background: SOCKET_COLOR }} />}
          </div>
          <div
            className={classes.ilvlBadge}
            style={{ background: qualityColor, color: badgeTextColor }}
          >
            {item.itemLevel}
          </div>
        </a>
      </HoverCard.Target>
      <HoverCard.Dropdown p="sm">
        <Text size="sm" fw={700} ff="heading" style={{ color: qualityColor }}>
          {item.name}
        </Text>
        <Text size="xs" c="dimmed" mt={2}>
          {item.slotName} · Item Level <b>{item.itemLevel}</b>
        </Text>
        {tierNumber != null && (
          <div className={classes.tooltipLine} style={{ color: tierColor }}>
            <span className={classes.tooltipSquare} style={{ background: tierColor }} />
            Tier set piece · T{tierNumber} · {item.tierSetName}
          </div>
        )}
        {item.enchant != null && (
          <div className={classes.tooltipLine} style={{ color: "#4d93ff" }}>
            <span className={classes.tooltipDot} style={{ background: "#4d93ff" }} />
            {item.enchant}
          </div>
        )}
        {item.missingEnchant && (
          <div className={classes.tooltipLine} style={{ color: ENCHANT_COLOR }}>
            <span
              className={classes.tooltipDot}
              style={{ background: "#1a1206", border: `1.5px solid ${ENCHANT_COLOR}` }}
            />
            Missing enchant
          </div>
        )}
        {item.sockets.map((socket, i) =>
          socket.filled ? (
            <div key={i} className={classes.tooltipLine} style={{ color: "#46d160" }}>
              <span className={classes.tooltipDiamond} style={{ background: "#46d160" }} />
              {socket.display ?? "Gem socketed"}
            </div>
          ) : (
            <div key={i} className={classes.tooltipLine} style={{ color: SOCKET_COLOR }}>
              <span
                className={classes.tooltipDiamond}
                style={{ background: "#1a0d0d", border: `1.5px solid ${SOCKET_COLOR}` }}
              />
              Empty socket
            </div>
          )
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
