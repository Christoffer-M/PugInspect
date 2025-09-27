import { AppShell, Typography } from "@mantine/core";
import Header from "./Header";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { parseRaiderIoUrl } from "../util/util";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData("text");
      if (pastedText) {
        const raiderIoUrl = parseRaiderIoUrl(pastedText);
        if (raiderIoUrl) {
          event.preventDefault();
          router.navigate({
            to: `/${raiderIoUrl.region.toLowerCase()}/${raiderIoUrl.realm.toLowerCase()}/${raiderIoUrl.name.toLowerCase()}`,
          });
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <AppShell header={{ height: 60 }}>
      <Typography>
        <Header />
        <AppShell.Main pb={"lg"}>{children}</AppShell.Main>
      </Typography>
    </AppShell>
  );
};
