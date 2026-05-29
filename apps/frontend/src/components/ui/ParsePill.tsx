import { Box, Text } from "@mantine/core";
import { getParseColor } from "../../util/util";
import classes from "./ParsePill.module.css";

export const ParsePill: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value == null) return <Text component="span" className={classes.dash}>—</Text>;
  const color = getParseColor(value);
  return (
    <Box component="span" className={classes.cell}>
      <Text component="span" className={classes.num} style={{ color }}>{Math.floor(value)}</Text>
      <Box component="span" className={classes.bar}>
        <Box component="span" className={classes.fill} style={{ width: `${value}%`, background: color }} />
      </Box>
    </Box>
  );
};
