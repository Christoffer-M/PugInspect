import { ActionIcon, Anchor, Center, Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { IconBrandDiscord, IconBrandGithub } from "@tabler/icons-react";

const Footer: React.FC = () => {
  return (
    <Stack component="footer" py="md" align="center" gap="sm">
      <Group gap="xs">
        <ActionIcon
          component="a"
          href="https://discord.gg/KkjDYSchvc"
          target="_blank"
          rel="noopener noreferrer"
          variant="subtle"
          aria-label="Join our Discord server"
        >
          <IconBrandDiscord size={20} />
        </ActionIcon>
        <ActionIcon
          component="a"
          href="https://github.com/Christoffer-M/PugInspect"
          target="_blank"
          rel="noopener noreferrer"
          variant="subtle"
          aria-label="Go to GitHub repository"
        >
          <IconBrandGithub size={20} />
        </ActionIcon>
      </Group>
      <Center>
        <Text size="xs" c="dimmed" ta="center">
          This website is a fan-made project and is not affiliated with or endorsed by Blizzard Entertainment, Warcraft Logs, or Raider.IO.<br />
          Data provided by Warcraft Logs and Raider.IO.<br />
          World of Warcraft® is a registered trademark of Blizzard Entertainment, Inc.<br />
          <Anchor component={Link} to="/privacy-policy" size="xs" c="dimmed">
            Privacy Policy
          </Anchor>
        </Text>
      </Center>
    </Stack>
  );
};

export default Footer;
