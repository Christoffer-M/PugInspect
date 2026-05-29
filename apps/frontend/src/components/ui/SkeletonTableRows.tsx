import { Table, Skeleton } from "@mantine/core";

type SkeletonTableRowsProps = {
  rows: number;
  columns: number;
};

export function SkeletonTableRows({ rows, columns }: SkeletonTableRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <Table.Tr key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <Table.Td key={j}>
              <Skeleton height={25} miw={10} />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
}
