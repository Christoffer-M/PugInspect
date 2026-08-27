import { Group, List, Modal, Text, ThemeIcon } from "@mantine/core";
import { IconShare2, IconSquarePlus } from "@tabler/icons-react";

/**
 * iOS Safari has no install API — the user has to go through the Share sheet,
 * so spell the steps out for them.
 */
export const InstallInstructionsModal: React.FC<{
  opened: boolean;
  onClose: () => void;
}> = ({ opened, onClose }) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text fw={600} size="sm">
        Add PugInspect to your home screen
      </Text>
    }
    centered
    styles={{
      content: { background: "#0e1628", border: "1px solid rgba(61, 79, 110, 0.5)" },
      header: { background: "transparent" },
    }}
  >
    <List spacing="sm" size="sm" type="ordered" c="#c2c8de">
      <List.Item>
        <Group gap={6} wrap="nowrap">
          <Text size="sm" span>
            Tap
          </Text>
          <ThemeIcon variant="light" color="accent" size="sm" radius="sm">
            <IconShare2 size={14} />
          </ThemeIcon>
          <Text size="sm" span>
            Share in the Safari toolbar
          </Text>
        </Group>
      </List.Item>
      <List.Item>
        <Group gap={6} wrap="nowrap">
          <Text size="sm" span>
            Choose
          </Text>
          <ThemeIcon variant="light" color="accent" size="sm" radius="sm">
            <IconSquarePlus size={14} />
          </ThemeIcon>
          <Text size="sm" span>
            Add to Home Screen
          </Text>
        </Group>
      </List.Item>
      <List.Item>Tap Add — PugInspect opens full screen from then on.</List.Item>
    </List>
  </Modal>
);
