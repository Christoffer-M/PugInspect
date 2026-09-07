import React from "react";
import { SkeletonTableRows } from "@repo/ui";
import { Table } from "@mantine/core";
import { Surface } from "./_surface";

export const RaidLogsLoading = () => (
  <Surface>
    <Table withRowBorders={false}>
      <Table.Thead>
        <Table.Tr>
          {["Encounter", "Best", "Median", "Kills", "iLvl", "Spec"].map((h) => (
            <Table.Th key={h}>{h}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        <SkeletonTableRows rows={5} columns={6} />
      </Table.Tbody>
    </Table>
  </Surface>
);

export const CompactGrid = () => (
  <Surface w={260}>
    <Table withRowBorders={false}>
      <Table.Tbody>
        <SkeletonTableRows rows={3} columns={2} />
      </Table.Tbody>
    </Table>
  </Surface>
);
