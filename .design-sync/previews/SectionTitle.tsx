import React from "react";
import { SectionTitle } from "@repo/ui";
import { Badge, Group, Select, Switch, Text } from "@mantine/core";
import { Surface } from "./_surface";

export const Default = () => (
  <Surface>
    <SectionTitle>Raid Progression</SectionTitle>
    <Text c="dimmed" size="sm">
      Section content sits below the title.
    </Text>
  </Surface>
);

export const WithControl = () => (
  <Surface>
    <SectionTitle
      right={
        <Select
          w="auto"
          value="Manaforge Omega"
          data={["Manaforge Omega", "Liberation of Undermine", "Nerub-ar Palace"]}
          readOnly
        />
      }
      noWrap
    >
      Raid Progression
    </SectionTitle>
  </Surface>
);

export const Subsection = () => (
  <Surface>
    <SectionTitle
      order={3}
      right={
        <Group gap="xs">
          <Switch label="Only best" size="xs" />
        </Group>
      }
    >
      Raid Logs
    </SectionTitle>
  </Surface>
);

export const WithBadge = () => (
  <Surface>
    <SectionTitle order={3} right={<Badge color="accent">Season 3</Badge>}>
      Mythic+ Runs
    </SectionTitle>
  </Surface>
);
