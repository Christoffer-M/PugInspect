import { ActionIcon, AppShell, Box, Container, Flex, Group, Text } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import CharacterSearchInput from "./CharacterSearchInput";

const Logo: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-label="Go to home page"
    onKeyDown={(e) => e.key === "Enter" && onClick()}
    style={{ cursor: "pointer", userSelect: "none" }}
  >
    <Text
      fw={700}
      size="xl"
      style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif",
        background: "linear-gradient(135deg, #c5bcf2 0%, #8b7fd4 50%, #6a5eac 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        letterSpacing: "0.06em",
        lineHeight: 1,
      }}
    >
      PugInspect
    </Text>
  </Box>
);

const Header: React.FC = () => {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  return (
    <AppShell.Header
      style={{
        backgroundColor: "rgba(4, 10, 20, 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(139, 127, 212, 0.35)",
      }}
    >
      <Container h="100%">
        <Group h="100%" justify="space-between">
          <Logo onClick={() => navigate({ to: "/" })} />
          {!matchRoute({ from: "/" }) && (
            <Flex justify="center" align="center" style={{ flex: 1 }}>
              <CharacterSearchInput />
            </Flex>
          )}
          <ActionIcon
            variant="subtle"
            component="a"
            href="https://github.com/Christoffer-M/PugInspect"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Go to GitHub repository"
            size="lg"
          >
            <IconBrandGithub />
          </ActionIcon>
        </Group>
      </Container>
    </AppShell.Header>
  );
};

export default Header;
