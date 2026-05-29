import { getParseColor } from "../../util/util";
import classes from "./ParsePill.module.css";

export const ParsePill: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value == null) return <span className={classes.dash}>—</span>;
  const color = getParseColor(value);
  return (
    <span className={classes.cell}>
      <span className={classes.num} style={{ color }}>{Math.floor(value)}</span>
      <span className={classes.bar}>
        <span className={classes.fill} style={{ width: `${value}%`, background: color }} />
      </span>
    </span>
  );
};
