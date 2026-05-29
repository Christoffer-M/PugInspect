import { SegmentedControl } from "@mantine/core";

type Partition = {
  id: number;
  compactName: string;
};

type PartitionSelectorProps = {
  partitions: Partition[];
  value: string;
  onChange: (value: string) => void;
};

export function PartitionSelector({ partitions, value, onChange }: PartitionSelectorProps) {
  if (partitions.length <= 1) return null;

  return (
    <SegmentedControl
      size="xs"
      data={[
        { label: "All", value: "all" },
        ...partitions.map((p) => ({ label: p.compactName, value: String(p.id) })),
      ]}
      value={value}
      onChange={(v) => v != null && onChange(v)}
    />
  );
}
