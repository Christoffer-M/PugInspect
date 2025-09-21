import { ActionIcon, AppShell, Container, Group } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

type HeaderProps = {
  showSearch?: boolean;
};

// ...existing code...
const Header: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();
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
        </Group>
      </Container>
    </AppShell.Header>
  );
};
// ...existing code...
export default Header;
