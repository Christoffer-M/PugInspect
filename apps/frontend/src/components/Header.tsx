import { ActionIcon, AppShell, Container, Flex, Group } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import CharacterSearchInput from "./CharacterSearchInput";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

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
          {!matchRoute({ from: "/" }) && (
            <Flex justify="center" align="center" style={{ flex: 1 }}>
              <CharacterSearchInput />
            </Flex>
          )}
        </Group>
      </Container>
    </AppShell.Header>
  );
};

export default Header;
