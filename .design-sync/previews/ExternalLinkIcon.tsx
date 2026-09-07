import React from "react";
import { ExternalLinkIcon } from "@repo/ui";
import { Group } from "@mantine/core";
import { Surface } from "./_surface";

// The app passes a bundled asset URL as `icon`; inlined here as a data URI so
// the card renders without network access. Source: apps/frontend/src/assets/.
const RAIDER_IO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMzAwIj48dGl0bGU+TG9nb18yQ29sb3JXaGl0ZSBjb3B5PC90aXRsZT48ZyBpZD0iTWFya18yQ29sb3JfV2hpdGUiPjxwYXRoIGQ9Ik0yOTQuOTEsMTE3LjRhOC43NSw4Ljc1LDAsMCwwLDIuMjItNy4zYy0uMjEtLjgtLjQtMS42LS42My0yLjRhOC45Myw4LjkzLDAsMCwwLTUuNjgtNS4zMWwtMjcuOTMtOC4zYTEzLjQ1LDEzLjQ1LDAsMCwxLTkuMzgtMTZsNi42Ni0yNy45NGE4LjksOC45LDAsMCwwLTEtNi43MUE5LjM2LDkuMzYsMCwwLDAsMjQ5LDM5LjE5bC0yOC40MSw2LjU1YTEzLjczLDEzLjczLDAsMCwxLTE2LjI0LTkuMjJMMTk1LjkxLDkuMDVhOC44OSw4Ljg5LDAsMCwwLTUuMjctNS41MmMtLjkxLS4yNS0xLjgyLS40Ni0yLjc0LS42OUE5LDksMCwwLDAsMTgwLjY1LDVMMTU5LjM4LDI0LjY3YTEzLjg5LDEzLjg5LDAsMCwxLTE4Ljc2LDBMMTE5LjM1LDVhOSw5LDAsMCwwLTcuMjUtMi4xOWMtLjkxLjIzLTEuODMuNDQtMi43NC42OWE4Ljg5LDguODksMCwwLDAtNS4yNyw1LjUyTDk1LjY1LDM2LjUyYTEzLjczLDEzLjczLDAsMCwxLTE2LjI0LDkuMjJMNTEsMzkuMTlhOS4zNiw5LjM2LDAsMCwwLTEwLjEzLDQuMjgsOC45LDguOSwwLDAsMC0xLDYuNzFsNi42NiwyNy45NGExMy40NSwxMy40NSwwLDAsMS05LjM4LDE2bC0yNy45Myw4LjNhOC44OSw4Ljg5LDAsMCwwLTUuNjgsNS4zMmMtLjIzLjc5LS40MiwxLjU5LS42MywyLjM5YTguNzIsOC43MiwwLDAsMCwyLjIyLDcuM2wyMCwyMC45MmExMy4zMSwxMy4zMSwwLDAsMSwwLDE4LjQ0bC0yMCwyMC45M2E4LjcyLDguNzIsMCwwLDAtMi4yMiw3LjRjLjE5Ljc0LjM3LDEuNDcuNTcsMi4yYTksOSwwLDAsMCw1Ljc0LDUuNEwzNy4xMSwyMDFhMTMuNDQsMTMuNDQsMCwwLDEsOS4zOCwxNmwtNi42NiwyNy45NWE4Ljg4LDguODgsMCwwLDAsMS40NSw3LjI2LDkuNTQsOS41NCwwLDAsMCwyLjMsMi4yN0E5LjIzLDkuMjMsMCwwLDAsNTEsMjU1Ljg5bDQ3LTVhNC4zMiw0LjMyLDAsMCwwLDMuOTItNC42N2MtMS41Ny0xNi45NS04LjkzLTgwLjMzLTExLjctMTA0QTE3LjUxLDE3LjUxLDAsMCwxLDk2LDEyNy4xM0wxNDIsODUuOWExMiwxMiwwLDAsMSwxNiwwbDQ2LDQxLjIzYTE3LjUzLDE3LjUzLDAsMCwxLDUuNzgsMTUuMDhjLTIuNzQsMjMuNjQtMTAuMDYsODcuMDUtMTEuNjIsMTA0YTQuMzIsNC4zMiwwLDAsMCwzLjkyLDQuNjdsNDcsNWE5LjQyLDkuNDIsMCwwLDAsOS43MS0zLjcyLDguODQsOC44NCwwLDAsMCwxLjQ2LTcuMjZMMjUzLjUxLDIxN2ExMy40NiwxMy40NiwwLDAsMSw5LjM4LTE2bDI3LjkzLTguM2E4LjksOC45LDAsMCwwLDUuNzMtNS40Yy4yMS0uNzMuMzktMS40Ny41OC0yLjJhOC43Niw4Ljc2LDAsMCwwLTIuMjItNy40bC0yMC0yMC45M2ExMy4zMiwxMy4zMiwwLDAsMSwwLTE4LjQ0WiIgc3R5bGU9ImZpbGw6I2U1YTAyNCIvPjxwYXRoIGQ9Ik0xNTQuNTUsMTI0LjA1YTYuMDksNi4wOSwwLDAsMC05LjEsMGwtMTUuNzcsMTcuODRhMTcuOTMsMTcuOTMsMCwwLDAtNC40OSwxM2w4LDEzMy4zNmE5LjU3LDkuNTcsMCwwLDAsOS4yMyw4LjgycTMuNzUuMiw3LjU0LjE5dDcuNTktLjE5YTkuNTYsOS41NiwwLDAsMCw5LjIzLTguODNsOC0xMzMuMzRhMTcuOTMsMTcuOTMsMCwwLDAtNC41LTEzWiIgc3R5bGU9ImZpbGw6I2ZmZiIvPjwvZz48L3N2Zz4=";
const GLOBE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8b7fd4" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/></svg>',
  );

export const Default = () => (
  <Surface w={200}>
    <ExternalLinkIcon href="https://raider.io" icon={RAIDER_IO} label="View on Raider.IO" />
  </Surface>
);

export const LinkRow = () => (
  <Surface w={240}>
    <Group gap="xs">
      <ExternalLinkIcon href="https://raider.io" icon={RAIDER_IO} label="View on Raider.IO" size={28} />
      <ExternalLinkIcon href="https://www.warcraftlogs.com" icon={GLOBE} label="View on WarcraftLogs" size={28} />
    </Group>
  </Surface>
);

export const Sizes = () => (
  <Surface w={240}>
    <Group gap="md" align="center">
      {[20, 28, 36, 48].map((s) => (
        <ExternalLinkIcon key={s} href="https://raider.io" icon={RAIDER_IO} label={`Size ${s}`} size={s} />
      ))}
    </Group>
  </Surface>
);
