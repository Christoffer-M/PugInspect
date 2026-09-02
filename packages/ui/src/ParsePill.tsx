import { Box, Text } from "@mantine/core";
import { getParseColor } from "./colors";
import classes from "./ParsePill.module.css";

export const ParsePill: React.FC<{
  value: number | null | undefined;
  /** Stretch the bar to fill the available row width (default: fixed table-cell width). */
  grow?: boolean;
  /** Number-only pill without the bar, for narrow columns. */
  compact?: boolean;
}> = ({ value, grow, compact }) => {
  if (value == null) return <Text component="span" className={classes.dash}>—</Text>;
  const color = getParseColor(value);
  if (compact) {
    return (
      <Text
        component="span"
        className={classes.compact}
        style={{ color, borderColor: `${color}66`, background: `${color}1f` }}
      >
        {Math.floor(value)}
      </Text>
    );
  }
  return (
    <Box component="span" className={`${classes.cell} ${grow ? classes.grow : ""}`}>
      <Text component="span" className={classes.num} style={{ color }}>{Math.floor(value)}</Text>
      <Box component="span" className={classes.bar}>
        <Box component="span" className={classes.fill} style={{ width: `${value}%`, background: color }} />
      </Box>
    </Box>
  );
};
