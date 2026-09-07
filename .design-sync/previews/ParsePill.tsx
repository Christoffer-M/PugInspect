import React from "react";
import { ParsePill } from "@repo/ui";
import { Stack, Table, Text } from "@mantine/core";
import { Surface } from "./_surface";

/** Bucket boundaries come from getParseColor(): <25 grey, <50 green,
 *  <75 blue, <95 purple, <99 orange, <100 pink, 100 gold. */
const BUCKETS = [12, 38, 61, 84, 97, 99.6, 100];

export const Buckets = () => (
  <Surface w={260}>
    <Stack gap={10}>
      {BUCKETS.map((v) => (
        <ParsePill key={v} value={v} />
      ))}
    </Stack>
  </Surface>
);

export const NoData = () => (
  <Surface w={260}>
    <Stack gap={10}>
      <ParsePill value={null} />
      <ParsePill value={undefined} />
    </Stack>
  </Surface>
);

export const InTableCell = () => (
  <Surface>
    <Table withRowBorders={false}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Encounter</Table.Th>
          <Table.Th>Best</Table.Th>
          <Table.Th>Median</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {[
          ["Plexus Sentinel", 99, 84],
          ["Loom'ithar", 91, 67],
          ["Soulbinder Naazindhri", 74, 43],
        ].map(([name, best, median]) => (
          <Table.Tr key={name as string}>
            <Table.Td>
              <Text size="sm">{name}</Text>
            </Table.Td>
            <Table.Td>
              <ParsePill value={best as number} />
            </Table.Td>
            <Table.Td>
              <ParsePill value={median as number} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </Surface>
);

export const Grow = () => (
  <Surface>
    <Stack gap={10}>
      <ParsePill value={96} grow />
      <ParsePill value={58} grow />
    </Stack>
  </Surface>
);
