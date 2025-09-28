import { AppShell, Typography } from "@mantine/core";
import Header from "./Header";
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "@tanstack/react-router";
import { parseRaiderIoUrl } from "../util/util";
import { notifications } from "@mantine/notifications";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const params = useParams({
    from: "/$region/$realm/$name",
    shouldThrow: false,
  });

  const pasteCounter = useRef(0);

  const annoyedMessages = [
    "You are already viewing this character. Doh!",
    "Seriously, you're *already here*...",
    "Stop pasting the same thing. It's getting old.",
    "Do you think something will change? It's the same page!",
    "Alright, now you're just messing with me...",
    "I'm not going to tell you again. Stop it.",
    "This is your last warning. Stop it now!",
    "That's it! I'm calling the cops on you!",
    "I'm done. I'm not going to respond anymore.",
    "Why do you keep doing this to me?",
    "Is this some kind of joke to you?",
    "I'm starting to question our relationship.",
    "Maybe try pasting something that isn't this character?",
    "I'm not your personal character portal, you know.",
    "If you paste this again, I'm going to start ignoring you.",
    "This is getting old. Please find a new character to obsess over.",
    "OK, last one. If you paste this again, I'm done.",
    "FINE! Paste it again, I DARE YOU!",
  ];

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData("text");

      if (pastedText) {
        const raiderIoUrl = parseRaiderIoUrl(pastedText);
        if (raiderIoUrl) {
          const { region, realm, name } = raiderIoUrl;
          event.preventDefault();
          const normalizedRegion = region.toLowerCase();
          const normalizedRealm = realm.toLowerCase();
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
              router
                .navigate({
                  href: "https://youtu.be/dQw4w9WgXcQ?si=ybyZ4Xqe06YwJuHG",
                })
                .finally(() => {
                  pasteCounter.current = 0;
                });

              return;
            }
            notifications.show({
              title: "Already on this character",
              message: annoyedMessages[messageIndex],
              color: "yellow",
            });

            return;
          }

          pasteCounter.current = 0;

          router.navigate({
            to: `/${normalizedRegion}/${normalizedRealm}/${normalizedName}`,
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
