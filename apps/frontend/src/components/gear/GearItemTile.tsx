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

// Wowhead's tooltip script reads this off the anchor and renders the item as
// this character actually has it. Multi-value params are colon-separated.
const wowheadData = (item: GearItem) => {
  const gems = item.sockets.flatMap((s) => (s.itemId != null ? [s.itemId] : []));
  return [
    `item=${item.itemId}`,
    `ilvl=${item.itemLevel}`,
    ...(item.bonusIds.length > 0 ? [`bonus=${item.bonusIds.join(":")}`] : []),
    ...(item.enchantId != null ? [`ench=${item.enchantId}`] : []),
    ...(gems.length > 0 ? [`gems=${gems.join(":")}`] : []),
  ].join("&");
};

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
    <a
      className={classes.itemCol}
      href={`https://www.wowhead.com/item=${item.itemId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${item.name} on Wowhead`}
      data-wowhead={wowheadData(item)}
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
        {item.missingEnchant && <span style={{ background: ENCHANT_COLOR }} />}
        {emptySockets > 0 && <span style={{ background: SOCKET_COLOR }} />}
      </div>
      <div
        className={classes.ilvlBadge}
        style={{ background: qualityColor, color: badgeTextColor }}
      >
        {item.itemLevel}
      </div>
    </a>
  );
};
