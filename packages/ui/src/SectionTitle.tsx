import { Group, Title } from "@mantine/core";
import classes from "./SectionTitle.module.css";

interface SectionTitleProps {
  order?: 2 | 3;
  children: React.ReactNode;
  right?: React.ReactNode;
  noWrap?: boolean;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ order = 2, children, right, noWrap }) => (
  <Group className={classes.head} justify="space-between" wrap="wrap">
    <Title order={order} style={noWrap ? { whiteSpace: "nowrap" } : undefined}>
      {children}
    </Title>
    {right}
  </Group>
);
