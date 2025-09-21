import {
  ActionIcon,
  AppShell,
  Container,
  Group,
  useMantineColorScheme,
} from "@mantine/core";
import { IconHome, IconMoon, IconSun } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

type HeaderProps = {
  showSearch?: boolean;
};

// ...existing code...
const Header: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();
  const { toggleColorScheme, colorScheme } = useMantineColorScheme();
  return (
    <AppShell.Header>
      <Container h="100%">
        <Group h="100%">
          <ActionIcon
            variant="outline"
            onClick={() => navigate({ to: "/" })}
            aria-label="Go to home page"
            size="lg"
          >
            <IconHome />
          </ActionIcon>
          <ActionIcon
            variant="outline"
            color={colorScheme === "dark" ? "yellow" : "blue"}
            onClick={toggleColorScheme}
            aria-label="Toggle color scheme"
            size="lg"
          >
            {colorScheme === "dark" ? <IconSun /> : <IconMoon />}
          </ActionIcon>
        </Group>
      </Container>
    </AppShell.Header>
  );
};
// ...existing code...
export default Header;
