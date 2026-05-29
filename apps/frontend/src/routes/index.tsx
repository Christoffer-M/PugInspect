import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import CharacterSearchInput from "../components/search/CharacterSearchInput";
import { Page } from "../components/layout/Page";
import { useEffect } from "react";
import classes from "./index.module.css";

const QUICK_CHARS = [
  { label: "Baldrin-Draenor", region: "eu", realm: "draenor", name: "baldrin", color: "#C69B3A" },
  { label: "Ceases-Kazzak", region: "eu", realm: "kazzak", name: "ceases", color: "#4d93ff" },
  { label: "Vaelra-Silvermoon", region: "eu", realm: "silvermoon", name: "vaelra", color: "#b072f0" },
];

const Home: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "PugInspect - WoW Character Inspector";
  }, []);

  return (
    <Page>
      <div className={classes.landing}>
        <div className={classes.inner}>
          <div className={classes.glyph}>
            <IconSearch size={30} stroke={1.8} />
          </div>

          <Title order={1} mb="sm">
            Welcome to PugInspect
          </Title>

          <p className={classes.tag}>
            Quickly view WoW character stats, RIO scores, and raid logs
          </p>

          <CharacterSearchInput />

          <p className={classes.hint}>
            Start by typing a character name above, or paste a Raider.IO profile URL.
          </p>

          <div className={classes.chips}>
            {QUICK_CHARS.map((char) => (
              <button
                key={char.label}
                className={classes.chip}
                onClick={() =>
                  navigate({ to: `/${char.region}/${char.realm}/${char.name}` })
                }
              >
                <span className={classes.chipDot} style={{ background: char.color }} />
                {char.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
});
