import { Anchor, Center, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";

const Footer: React.FC = () => {
  return (
    <Center component="footer" py="md">
      <Text size="xs" c="dimmed" ta="center">
        This website is a fan-made project and is not affiliated with or endorsed by Blizzard Entertainment, Warcraft Logs, or Raider.IO.<br />
        Data provided by Warcraft Logs and Raider.IO.<br />
        World of Warcraft® is a registered trademark of Blizzard Entertainment, Inc.<br />
        <Anchor component={Link} to="/privacy-policy" size="xs" c="dimmed">
          Privacy Policy
        </Anchor>
      </Text>
    </Center>
  );
};

export default Footer;
