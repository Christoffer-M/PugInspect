import {
  Autocomplete,
  Flex,
  Kbd,
  Loader,
  Select,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  normalizeRealm,
  parseCharacterUrl,
  upperCaseFirstLetter,
} from "../../util/util";
import { useCharacterSearchQuery } from "../../queries/character-search";

// The only four regions every upstream serves. OCE, SA and RU are not Blizzard
// API regions at all — those realms sit under us (Frostmourne, Barthilas,
// Ragnaros) and eu (Howling Fjord, Gordunni). CN is a separate Blizzard China
// API we have no credentials for. None of them ever worked; don't add them back.
export const regions = ["EU", "US", "KR", "TW"];

const pasteKeys = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ V" : "Ctrl V";
const PASTE_TIP_SEEN = "pasteAnywhereTipSeen";

const CharacterSearchInput: React.FC = () => {
  const params = useParams({
    from: "/$region/$realm/$name",
    shouldThrow: false,
  });
  const theme = useMantineTheme();
  const hasKeyboard = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);

  const initialRegion = params?.region;
  const initialRealm = params?.realm;
  const initialName = params?.name;
  const [searchTerm, setSearchTerm] = useState("");
  const [region, setRegion] = useState(
    initialRegion?.toUpperCase() || localStorage.getItem("region") || "EU",
  );

  const [debouncedSearch] = useDebouncedValue(searchTerm, 300);

  const [errorText, setErrorText] = useState("");
  const router = useRouter();
  const showPasteHint = hasKeyboard && !searchTerm;

  const { data: searchResults = [], isLoading } = useCharacterSearchQuery(
    debouncedSearch,
    region,
    !!errorText || searchTerm === `${initialName}-${initialRealm}`,
  );

  const handleCharacterUrl = (url: string) => {
    const parsed = parseCharacterUrl(url);
    if (parsed) {
      setRegion(parsed.region.toUpperCase());
      navigateToCharacter(
        `${upperCaseFirstLetter(parsed.name)}-${upperCaseFirstLetter(parsed.realm)}`,
      );
    } else {
      setErrorText("Invalid character URL");
    }
  };

  useEffect(() => {
    if (initialRegion) {
      setRegion(initialRegion.toUpperCase());
    }
  }, [initialName, initialRealm, initialRegion]);

  /** realmSlug comes from an autocomplete pick; typed and pasted input only
   *  has the realm as written, and the character page redirects if it's off. */
  const navigateToCharacter = (input: string, realmSlug?: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // A link we couldn't parse still lands in the box; split as "Name-Realm" it
    // becomes a plausible-looking wrong character ("raider.io/ru/characters/eu/
    // dun-modr/Kiwitox?..." navigated to /eu/modr/kiwitox, because the "?" ends
    // the pathname). Reject it instead of fetching a realm nobody asked for.
    if (/[/:]/.test(trimmed)) {
      setErrorText("Invalid character URL");
      return;
    }

    // Split only on the first dash: name is before, realm is everything after
    const dashIndex = trimmed.indexOf("-");
    if (dashIndex === -1) {
      setErrorText("Invalid character or realm");
      return;
    }
    const name = trimmed.slice(0, dashIndex).trim();
    const realm = trimmed.slice(dashIndex + 1).trim();

    if (name && realm) {
      router
        .navigate({
          to: `/${region.toLowerCase()}/${realmSlug ?? normalizeRealm(realm)}/${name.toLowerCase()}`,
        })
        .then(() => setSearchTerm(""));
    } else {
      setErrorText("Invalid character or realm");
    }
  };

  return (
    <Flex gap="xs" w="100%">
      <Select
        placeholder="EU"
        data={regions}
        w="75"
        value={region}
        onChange={(value) => {
          setRegion(value || "EU");
          localStorage.setItem("region", value || "EU");
        }}
        comboboxProps={{
          transitionProps: { transition: "pop", duration: 200 },
        }}
      />
      <Autocomplete
        error={errorText}
        limit={10}
        // The server already matched these; Mantine's default substring filter
        // would hide "Condenial-Tarren Mill" for a half-typed "cond-TarrenM".
        filter={({ options }) => options}
        placeholder={hasKeyboard ? "Ceases-Kazzak or paste a link" : "Ceases-Kazzak"}
        data={searchResults?.map((r) => ({
          value: `${r.name}-${r.realm}`,
          label: `${r.name}-${r.realm}`,
        }))}
        value={searchTerm}
        onChange={(search) => {
          if (errorText) setErrorText("");

          setSearchTerm(search);
        }}
        onOptionSubmit={(selectedValue) => {
          const picked = searchResults.find((r) => `${r.name}-${r.realm}` === selectedValue);
          navigateToCharacter(selectedValue, picked?.realmSlug);
        }}
        style={{ flex: 1, minWidth: 0 }}
        comboboxProps={{
          transitionProps: { transition: "pop", duration: 200 },
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;

          if (searchResults.length === 0) {
            event.preventDefault();
            navigateToCharacter(searchTerm);
          }
        }}
        onPaste={(e) => {
          const pastedText = e.clipboardData?.getData("text") || "";
          const lower = pastedText.toLowerCase();
          if (
            lower.includes("raider.io/") ||
            lower.includes("puginspect.com/")
          ) {
            handleCharacterUrl(pastedText);
            // Phones can only paste into a text field, so "anywhere" is desktop-only.
            if (hasKeyboard && !localStorage.getItem(PASTE_TIP_SEEN)) {
              localStorage.setItem(PASTE_TIP_SEEN, "1");
              notifications.show({
                title: "Tip: paste anywhere",
                message: `Press ${pasteKeys} anywhere on the page to open a character link.`,
                autoClose: 6000,
              });
            }
            return;
          }
        }}
        rightSectionPointerEvents="auto"
        rightSectionWidth={!isLoading && showPasteHint ? 56 : undefined}
        rightSection={
          isLoading ? (
            <Loader size="sm" color={theme.colors.gray[1]} />
          ) : !showPasteHint ? null : (
            <Tooltip
              label="Paste a Raider.IO or PugInspect link anywhere on the page or in the search box. Either works."
              multiline
              w={220}
              withArrow
            >
              <Kbd
                size="sm"
                // The monospace ⌘ glyph renders a third smaller than the V.
                ff="var(--mantine-font-family)"
                style={{ cursor: "help", whiteSpace: "nowrap" }}
              >
                {pasteKeys}
              </Kbd>
            </Tooltip>
          )
        }
      />
    </Flex>
  );
};

export default CharacterSearchInput;
