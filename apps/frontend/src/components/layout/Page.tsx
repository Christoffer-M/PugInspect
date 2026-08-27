import { AppShell, Typography } from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import Header from "./Header";
import Footer from "./Footer";
import classes from "./Page.module.css";
import { useRef } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { normalizeRealm, parseCharacterUrl } from "../../util/util";
import { notifications } from "@mantine/notifications";
import { annoyedMessages } from "../../data/annoyedMessagegs";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const params = useParams({
    from: "/$region/$realm/$name",
    shouldThrow: false,
  });

  const pasteCounter = useRef(0);

  useWindowEvent("paste", (event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData("text");

    if (pastedText) {
      const characterUrl = parseCharacterUrl(pastedText);
      if (characterUrl) {
        event.preventDefault();
        const { region, realm, name } = characterUrl;

        const normalizedRegion = region.toLowerCase();
        const normalizedRealm = normalizeRealm(realm);
        const normalizedName = name.toLowerCase();

        if (
          params?.region === normalizedRegion &&
          params?.realm === normalizedRealm &&
          params?.name === normalizedName
        ) {
          pasteCounter.current += 1;
          const messageIndex = Math.min(
            pasteCounter.current - 1,
            annoyedMessages.length - 1,
          );
          if (pasteCounter.current > annoyedMessages.length) {
            navigate({
              href: "https://youtu.be/dQw4w9WgXcQ?si=ybyZ4Xqe06YwJuHG",
            }).finally(() => {
              pasteCounter.current = 0;
            });

            return;
          }
          notifications.show({
            title: "Already on this character",
            message: annoyedMessages[messageIndex],
            color: "yellow",
            autoClose: 2500,
          });

          return;
        }

        pasteCounter.current = 0;

        navigate({
          to: `/${normalizedRegion}/${normalizedRealm}/${normalizedName}`,
        });
      }
    }
  });

  return (
    <>
      <div className={classes.appBg} />
      {/* Installed on iOS the app draws under the status bar, so the header
          grows by the safe-area inset and the main content clears the home
          indicator. Both insets are 0 in an ordinary browser tab. */}
      <AppShell
        header={{ height: "calc(60px + env(safe-area-inset-top))" }}
        className={classes.shell}
      >
        <Typography>
          <Header />
          <AppShell.Main
            style={{
              paddingBottom: "calc(var(--mantine-spacing-lg) + env(safe-area-inset-bottom))",
            }}
          >
            {children}
            <Footer />
          </AppShell.Main>
        </Typography>
      </AppShell>
    </>
  );
};
