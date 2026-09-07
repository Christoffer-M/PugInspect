## PugInspect UI — how to build with it

This is a **Mantine v8 design system**, dark-only. `window.PugInspectUI` carries the
four PugInspect components (`SectionTitle`, `ParsePill`, `ExternalLinkIcon`,
`SkeletonTableRows`), the `theme` object, the domain colour helpers, and the whole of
`@mantine/core` (`Paper`, `Stack`, `Group`, `Grid`, `Table`, `Text`, `Title`, `Badge`,
`Button`, `Select`, `Switch`, `Skeleton`, `ActionIcon`, `Anchor`, `Image`, …).

### Required wrapper

Every component reads theme from Mantine context. Without the provider they render
with default Mantine colours and the wrong fonts:

```jsx
const { MantineProvider, theme } = window.PugInspectUI;

<MantineProvider theme={theme} defaultColorScheme="dark">
  {children}
</MantineProvider>
```

The system is dark-only — there is no light palette. Put page content on the dark
ground (`#060b16`, what the app sets on `body`); never render these components on white.

### Styling idiom: props, not classes

There is **no utility-class vocabulary**. Style through Mantine props and the theme:

- colour: `c="dimmed"` (→ `#8a96aa`), `c="accent"`, `color="accent"` (Badge/Button/ActionIcon), `bg="dark.6"`
- spacing: `p`/`px`/`py`, `m`/`mt`/`mb`, `gap` — scale keys `xs sm md lg xl`
- size/shape: `size="sm"`, `radius="md"`, `fw={600}`, `w`, `h`, `maw`
- layout: `<Stack gap="md">`, `<Group justify="space-between">`, `<Grid gutter="xs">`

Theme colours are `accent` (primary purple, shade 5 in dark — `#8b7fd4`) and an
overridden `dark` scale (`dark.2` `#8a96aa` dimmed text, `dark.4` `#3d4f6e` borders,
`dark.6` `#0f1d35` surface, `dark.7` `#080e1c` deepest). Always reach for the **name**
(`c="accent"`, `bg="dark.6"`, `c="dimmed"`), never a raw hex: `MantineProvider` injects
this theme's palette at runtime, so `var(--mantine-color-accent-5)` is undefined in the
shipped CSS and `var(--mantine-color-dark-*)` still holds Mantine's stock greys there.
Non-colour tokens are safe to use directly: `var(--mantine-spacing-md)`,
`var(--mantine-radius-md)`, `var(--mantine-font-family-headings)`, and `var(--mono)`
(the JetBrains Mono stack).

`Paper` is pre-styled by the theme as a glass panel (gradient + `rgba(61,79,110,0.5)`
border, `radius="md"`) — use it for cards rather than hand-rolling a surface.

Fonts: Inter (body), Space Grotesk (headings), JetBrains Mono (numerics). All three
ship in `fonts/` and load from `styles.css`.

### Domain helpers (real functions, not decoration)

`getParseColor(n)` → the WarcraftLogs parse ramp (grey <25, green <50, blue <75,
purple <95, orange <99, pink <100, gold 100). `getClassColor(name)` / `CLASS_COLORS`,
`getQualityColor(q)` / `WOW_QUALITY_COLORS`, `RAID_DIFFICULTY_COLORS`
(`normal` `#22c55e`, `heroic` `#3b82f6`, `mythic` `#f4a50e`), `ROLE_COLORS`.
`pageClasses.appBg` / `pageClasses.shell` are the app's atmospheric page background.

### Where the truth is

Read `_ds/<folder>/styles.css` and its imports for the real cascade, and
`components/<group>/<Name>/<Name>.prompt.md` for per-component API and usage.

### Idiomatic snippet

```jsx
const { MantineProvider, theme, SectionTitle, ParsePill, Paper, Table, Text, Badge } =
  window.PugInspectUI;

<MantineProvider theme={theme} defaultColorScheme="dark">
  <Paper p="md">
    <SectionTitle order={3} right={<Badge color="accent">Season 3</Badge>}>
      Raid Logs
    </SectionTitle>
    <Table withRowBorders={false}>
      <Table.Tbody>
        <Table.Tr>
          <Table.Td><Text size="sm">Plexus Sentinel</Text></Table.Td>
          <Table.Td><ParsePill value={99} /></Table.Td>
        </Table.Tr>
      </Table.Tbody>
    </Table>
  </Paper>
</MantineProvider>
```
