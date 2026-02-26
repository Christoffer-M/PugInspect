import { Table } from "@mantine/core";
import React from "react";

export const DungeonNameMaxWidth = 200;

const RunTableHeader: React.FC = () => (
  <Table.Thead>
    <Table.Tr>
      <Table.Th w={DungeonNameMaxWidth}>Dungeon Name</Table.Th>
      <Table.Th miw={90}>Level</Table.Th>
      <Table.Th>Spec</Table.Th>
      <Table.Th>Date</Table.Th>
    </Table.Tr>
  </Table.Thead>
);

export default RunTableHeader;
