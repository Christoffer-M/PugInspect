import { ActionIcon, AppShell, Box, Container, Flex, Group, Text } from "@mantine/core";
import { IconBrandGithub, IconHistory } from "@tabler/icons-react";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SearchHistoryDrawer } from "./SearchHistoryDrawer/SearchHistoryDrawer";
import CharacterSearchInput from "./CharacterSearchInput";

const logoTextStyle: React.CSSProperties = {
  fontFamily: "Space Grotesk, system-ui, sans-serif",
  background: "linear-gradient(135deg, #c5bcf2 0%, #8b7fd4 50%, #6a5eac 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  letterSpacing: "0.06em",
  lineHeight: 1,
};

const Logo: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Box
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-label="Go to home page"
    onKeyDown={(e) => e.key === "Enter" && onClick()}
    style={{ cursor: "pointer", userSelect: "none", flexShrink: 0 }}
  >
    <Text fw={700} size="xl" hiddenFrom="xs" style={logoTextStyle}>
      PI
    </Text>
    <Text fw={700} size="xl" visibleFrom="xs" style={logoTextStyle}>
      PugInspect
    </Text>
  </Box>
);

const Header: React.FC = () => {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <AppShell.Header
        style={{
          backgroundColor: "rgba(4, 10, 20, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(139, 127, 212, 0.35)",
        }}
      >
        <Container h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Logo onClick={() => navigate({ to: "/" })} />
            {!matchRoute({ from: "/" }) && (
              <Flex justify="center" align="center" style={{ flex: 1, minWidth: 0 }}>
                <CharacterSearchInput />
              </Flex>
            )}
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label="View recent characters"
                onClick={() => setHistoryOpen(true)}
              >
                <IconHistory />
              </ActionIcon>
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
          </Group>
        </Container>
      </AppShell.Header>

      <SearchHistoryDrawer opened={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
};

export default Header;
