import {
  ActionIcon,
  Container,
  Flex,
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
    <Container
      top={0}
      mb="md"
      style={{
        position: "sticky",
        zIndex: 100,
        backgroundColor: "var(--mantine-color-body)",
      }}
    >
      <Flex justify="flex-start" w="100%" p="md" gap="md">
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
      </Flex>
    </Container>
  );
};
// ...existing code...
export default Header;
