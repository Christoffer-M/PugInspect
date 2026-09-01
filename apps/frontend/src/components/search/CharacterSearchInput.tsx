import {
  Autocomplete,
  Flex,
  Loader,
  Select,
  useMantineTheme,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
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

const CharacterSearchInput: React.FC = () => {
  const params = useParams({
    from: "/$region/$realm/$name",
    shouldThrow: false,
  });
  const theme = useMantineTheme();

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

  const navigateToCharacter = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

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
          to: `/${region.toLowerCase()}/${normalizeRealm(realm)}/${name.toLowerCase()}`,
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
        placeholder="Ceases-Kazzak or paste a link"
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
          navigateToCharacter(selectedValue);
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
            return;
          }
        }}
        rightSection={
          isLoading ? <Loader size="sm" color={theme.colors.gray[1]} /> : null
        }
      />
    </Flex>
  );
};

export default CharacterSearchInput;
