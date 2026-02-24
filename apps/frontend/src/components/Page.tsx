import { AppShell, Typography } from "@mantine/core";
import Header from "./Header";
import Footer from "./Footer";
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { parseRaiderIoUrl } from "../util/util";
import { notifications } from "@mantine/notifications";
import { annoyedMessages } from "../data/annoyedMessagegs";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const params = useParams({
    from: "/$region/$realm/$name",
    shouldThrow: false,
  });

  const pasteCounter = useRef(0);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData("text");

      if (pastedText) {
        const raiderIoUrl = parseRaiderIoUrl(pastedText);
        if (raiderIoUrl) {
          event.preventDefault();
          const { region, realm, name } = raiderIoUrl;

          const normalizedRegion = region.toLowerCase();
          const normalizedRealm = realm.toLowerCase();
          const normalizedName = name.toLowerCase();

          if (
            paramsRef.current?.region === normalizedRegion &&
            paramsRef.current?.realm === normalizedRealm &&
            paramsRef.current?.name === normalizedName
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
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <AppShell header={{ height: 60 }}>
      <Typography>
        <Header />
        <AppShell.Main pb={"lg"}>
          {children}
          <Footer />
        </AppShell.Main>
      </Typography>
    </AppShell>
  );
};
