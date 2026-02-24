import { Table } from "@mantine/core";
import React from "react";

const RunTableHeader: React.FC = () => (
  <Table.Thead>
    <Table.Tr>
      <Table.Th>Dungeon Name</Table.Th>
      <Table.Th>Level</Table.Th>
      <Table.Th>Role</Table.Th>
      <Table.Th>Date</Table.Th>
    </Table.Tr>
  </Table.Thead>
);

export default RunTableHeader;
