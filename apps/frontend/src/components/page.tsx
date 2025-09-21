import { AppShell, Typography } from "@mantine/core";
import Header from "./header";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell header={{ height: 60 }}>
    <Typography>
      <Header />
      <AppShell.Main>{children}</AppShell.Main>
    </Typography>
  </AppShell>
);
