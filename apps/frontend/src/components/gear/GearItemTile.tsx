import { HoverCard, Text } from "@mantine/core";
import { GearItem } from "../../graphql/graphql";
import { getTierNumber } from "../../data/tierSets";
import { getQualityColor } from "../../util/util";
import classes from "./GearSection.module.css";

// Light quality colors need dark badge text (COMMON is literally white).
const LIGHT_QUALITIES = new Set(["COMMON", "UNCOMMON", "ARTIFACT", "HEIRLOOM"]);

export const GearItemTile: React.FC<{ item: GearItem; tierColor?: string }> = ({
  item,
  tierColor,
}) => {
  const qualityColor = getQualityColor(item.quality);
  const badgeTextColor = LIGHT_QUALITIES.has(item.quality) ? "#060b16" : "#ffffff";

  return (
    <HoverCard width={260} shadow="md" withArrow openDelay={150} closeDelay={100}>
      <HoverCard.Target>
        <div className={classes.itemCol}>
          <div className={classes.tile} style={{ borderColor: qualityColor }}>
            {item.iconUrl && (
              <img src={item.iconUrl} alt={item.name} className={classes.tileIcon} loading="lazy" />
            )}
            {item.tierSetId != null && (
              <div className={classes.tierMarker} style={{ background: tierColor }}>
                T
              </div>
            )}
            <div className={classes.indicators}>
              {item.enchant != null && <div className={classes.enchantDot} />}
              {item.missingEnchant && <div className={classes.missingEnchantDot} />}
              {item.sockets.some((s) => s.filled) && <div className={classes.gemDiamond} />}
              {item.sockets.some((s) => !s.filled) && <div className={classes.emptySocketDiamond} />}
            </div>
          </div>
          <div
            className={classes.ilvlBadge}
            style={{ background: qualityColor, color: badgeTextColor }}
          >
            {item.itemLevel}
          </div>
        </div>
      </HoverCard.Target>
      <HoverCard.Dropdown p="sm">
        <Text size="sm" fw={700} ff="heading" style={{ color: qualityColor }}>
          {item.name}
        </Text>
        <Text size="xs" c="dimmed" mt={2}>
          {item.slotName} · Item Level <b>{item.itemLevel}</b>
        </Text>
        {item.tierSetName != null && (
          <div className={classes.tooltipLine} style={{ color: tierColor }}>
            <span className={classes.tooltipSquare} style={{ background: tierColor }} />
            {item.tierSetId != null && getTierNumber(item.tierSetId) != null
              ? `Tier set piece · T${getTierNumber(item.tierSetId)} · ${item.tierSetName}`
              : `Tier set piece · ${item.tierSetName}`}
          </div>
        )}
        {item.enchant != null && (
          <div className={classes.tooltipLine} style={{ color: "#4d93ff" }}>
            <span className={classes.tooltipDot} style={{ background: "#4d93ff" }} />
            {item.enchant}
          </div>
        )}
        {item.missingEnchant && (
          <div className={classes.tooltipLine} style={{ color: "#f0983d" }}>
            <span
              className={classes.tooltipDot}
              style={{ background: "#1a1206", border: "1.5px solid #f0983d" }}
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
            <div key={i} className={classes.tooltipLine} style={{ color: "#f56b6b" }}>
              <span
                className={classes.tooltipDiamond}
                style={{ background: "#1a0d0d", border: "1.5px solid #f56b6b" }}
              />
              Empty socket
            </div>
          )
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
