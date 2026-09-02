import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "accent",
  primaryShade: { dark: 5, light: 6 },
  colors: {
    accent: [
      "#f0eeff",
      "#dbd5f8",
      "#c5bcf2",
      "#afa3ec",
      "#9b91e0",
      "#8b7fd4",
      "#7a6ec0",
      "#6a5eac",
      "#584e98",
      "#463d80",
    ],
    dark: [
      "#c9d1e0",
      "#a8b4c8",
      "#8a96aa",
      "#6b7590",
      "#3d4f6e",
      "#253354",
      "#0f1d35",
      "#080e1c",
      "#040a14",
      "#020609",
    ],
  },
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  headings: {
    fontFamily: "Space Grotesk, system-ui, sans-serif",
  },
  components: {
    Paper: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          borderColor: "rgba(61, 79, 110, 0.5)",
          background: "linear-gradient(180deg, rgba(18,30,54,0.55) 0%, rgba(10,18,34,0.75) 100%)",
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        color: "accent",
      },
    },
    AppShell: {
      styles: {
        root: { background: "transparent" },
        main: { background: "transparent" },
      },
    },
  },
});
