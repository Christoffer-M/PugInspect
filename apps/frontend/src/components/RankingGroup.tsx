import { Group, Skeleton, Text } from "@mantine/core";

interface RankingGroupProps {
  label: string;
  value: number | string | null | undefined;
  isLoading?: boolean;
  color?: string;
}

export const RankingGroup: React.FC<RankingGroupProps> = ({
  label,
  value,
  isLoading = false,
  color,
}) => (
  <Group justify="space-between" w="100%" align="center">
    <Text fw={700} m={0}>
      {label}
    </Text>
    {isLoading ? (
      <Skeleton h={15} w={50} radius={100} m={0} animate />
    ) : (
      <Text fw={700} m={0} c={color}>
        {value ?? "N/A"}
      </Text>
    )}
  </Group>
);
