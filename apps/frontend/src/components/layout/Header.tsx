import {
  ActionIcon,
  AppShell,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Flex,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChartBar,
  IconDeviceMobileDown,
  IconHistory,
  IconMenu2,
  IconPuzzle,
  IconSearch,
} from "@tabler/icons-react";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SearchHistoryDrawer } from "../search/SearchHistoryDrawer/SearchHistoryDrawer";
import CharacterSearchInput from "../search/CharacterSearchInput";
import { InstallInstructionsModal } from "../pwa/InstallInstructionsModal";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import classes from "./Header.module.css";

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
    <Text fw={700} size="xl" hiddenFrom="xs" m={0} style={logoTextStyle}>
      PI
    </Text>
    <Text fw={700} size="xl" visibleFrom="xs" style={logoTextStyle}>
      PugInspect
    </Text>
  </Box>
);

const navIconBox: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid rgba(61, 79, 110, 0.5)",
  background: "rgba(8, 14, 28, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

function NavRow({
  icon,
  label,
  desc,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 10,
        background: active ? "rgba(139, 127, 212, 0.14)" : "transparent",
      }}
    >
      <Box style={navIconBox}>{icon}</Box>
      <Stack gap={2}>
        <Text size="sm" fw={active ? 600 : 500} c={active ? "#e6ebf5" : "#c2c8de"}>
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {desc}
        </Text>
      </Stack>
    </UnstyledButton>
  );
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const { canInstall, needsManualInstructions, promptInstall } = useInstallPrompt();

  const onRankings = !!matchRoute({ to: "/mythic-plus" });

  return (
    <>
      <AppShell.Header
        style={{
          backgroundColor: "rgba(4, 10, 20, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(139, 127, 212, 0.35)",
          // Keeps the bar's contents below the status bar when installed.
          paddingTop: "env(safe-area-inset-top)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
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
              <Button
                component={Link}
                to="/mythic-plus"
                visibleFrom="sm"
                leftSection={<IconChartBar size={15} color="#8b7fd4" />}
                variant="default"
                className={classes.rankings}
                data-active={onRankings || undefined}
              >
                Rankings
              </Button>
              <ActionIcon
                variant="subtle"
                size="lg"
                visibleFrom="sm"
                aria-label="View recent characters"
                onClick={() => setHistoryOpen(true)}
              >
                <IconHistory />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="lg"
                hiddenFrom="sm"
                aria-label="Open menu"
                onClick={() => setNavOpen(true)}
              >
                <IconMenu2 />
              </ActionIcon>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <Drawer
        opened={navOpen}
        onClose={() => setNavOpen(false)}
        position="right"
        size={300}
        title={
          <Text size="xs" tt="uppercase" c="dimmed" fw={600} style={{ letterSpacing: "0.14em" }}>
            Menu
          </Text>
        }
        styles={{
          // The theme's glassmorphism Paper background lets the page bleed
          // through a full-height drawer — pin it to a solid panel color.
          content: {
            display: "flex",
            flexDirection: "column",
            background: "#0e1628",
            borderLeft: "1px solid rgba(61, 79, 110, 0.5)",
          },
          header: { background: "transparent" },
          body: { flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 },
        }}
      >
        <NavRow
          icon={<IconSearch size={17} color="#8b7fd4" />}
          label="Character search"
          desc="Stats, RIO and logs"
          active={!!matchRoute({ to: "/" }) || !!matchRoute({ to: "/$region/$realm/$name" })}
          onClick={() => {
            setNavOpen(false);
            navigate({ to: "/" });
          }}
        />
        <NavRow
          icon={<IconChartBar size={17} color="#8b7fd4" />}
          label="Rankings"
          desc="Mythic+ spec meta"
          active={onRankings}
          onClick={() => {
            setNavOpen(false);
            navigate({ to: "/mythic-plus" });
          }}
        />
        <NavRow
          icon={<IconHistory size={17} color="#8b7fd4" />}
          label="Recent"
          desc="Characters you viewed"
          onClick={() => {
            setNavOpen(false);
            setHistoryOpen(true);
          }}
        />
        {canInstall && (
          <NavRow
            icon={<IconDeviceMobileDown size={17} color="#8b7fd4" />}
            label="Install app"
            desc="Add PugInspect to your home screen"
            onClick={() => {
              setNavOpen(false);
              if (needsManualInstructions) {
                setInstallHelpOpen(true);
                return;
              }
              void promptInstall();
            }}
          />
        )}
        <Divider mt="auto" mb="sm" color="rgba(61, 79, 110, 0.4)" />
        <Stack gap={10} px={12}>
          <Text
            component="a"
            href="https://www.curseforge.com/wow/addons/puginspect"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            c="accent"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <IconPuzzle size={15} /> Get the addon
          </Text>
          <Group gap={6}>
            <Text component={Link} to="/stats" size="sm" c="dimmed" onClick={() => setNavOpen(false)}>
              Stats
            </Text>
            <Text size="sm" c="dimmed">
              ·
            </Text>
            <Text
              component={Link}
              to="/privacy-policy"
              size="sm"
              c="dimmed"
              onClick={() => setNavOpen(false)}
            >
              Privacy Policy
            </Text>
          </Group>
        </Stack>
      </Drawer>

      <SearchHistoryDrawer opened={historyOpen} onClose={() => setHistoryOpen(false)} />

      <InstallInstructionsModal
        opened={installHelpOpen}
        onClose={() => setInstallHelpOpen(false)}
      />
    </>
  );
};

export default Header;
