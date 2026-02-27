import { Group, Skeleton, Text } from "@mantine/core";

interface RankingGroupProps {
  label: string;
  value?: number | string;
  isLoading?: boolean;
  color?: string;
}

export const RioScore: React.FC<RankingGroupProps> = ({
  label,
  value,
  isLoading = false,
  color,
}) => (
  <Skeleton visible={isLoading} animate>
    <Group justify="space-between" w="100%" align="flex-start" >
      {isLoading ? (
        <Skeleton h={15} w={50} radius={100} m={0} animate />
      ) : (
        <Group justify="flex-start" gap={2}>
          <Text fw={700} m={0} c={color}>
            {value ?? "N/A"}
          </Text>
          {label && <Text size="xs" c='dimmed' m={0}> {label}</Text>}
        </Group>
      )}
    </Group>
  </Skeleton>
);
