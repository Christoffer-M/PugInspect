import {
  Autocomplete,
  Flex,
  Loader,
  Select,
  useMantineTheme,
} from "@mantine/core";
import { useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  parseRaiderIoUrl,
  upperCaseFirstLetter,
  useDebounce,
} from "../util/util";
import { useCharacterSearchQuery } from "../queries/character-search";

export const regions = ["EU", "US", "KR", "TW", "CN", "OCE", "SA", "RU"];

const CharacterSearchInput: React.FC = () => {
  const params = useParams({
    from: "/$region/$realm/$name",
    shouldThrow: false,
  });
  const theme = useMantineTheme();

  const initialRegion = params?.region;
  const initialRealm = params?.realm;
  const initialName = params?.name;
  const [searchTerm, setSearchTerm] = useState(
    initialName && initialRealm ? `${initialName}-${initialRealm}` : "",
  );
  const [region, setRegion] = useState(
    initialRegion?.toUpperCase() || localStorage.getItem("region") || "EU",
  );

  const debouncedSearch = useDebounce(searchTerm, 300);

  const [errorText, setErrorText] = useState("");
  const router = useRouter();

  const { data: searchResults = [], isLoading } = useCharacterSearchQuery(
    debouncedSearch,
    region,
    !!errorText || searchTerm === `${initialName}-${initialRealm}`,
  );

  const handleRaiderIoUrl = (url: string) => {
    const parsed = parseRaiderIoUrl(url);
    if (parsed) {
      setSearchTerm(
        `${upperCaseFirstLetter(parsed.name)}-${upperCaseFirstLetter(parsed.realm)}`,
      );
      setRegion(parsed.region.toUpperCase());
      navigateToCharacter(
        `${upperCaseFirstLetter(parsed.name)}-${upperCaseFirstLetter(parsed.realm)}`,
      );
    } else {
      setErrorText("Invalid Raider.IO URL");
    }
  };

  useEffect(() => {
    if (initialName && initialRealm) {
      setSearchTerm(`${initialName}-${initialRealm}`);
    }
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
      router.navigate({
        to: `/${region.toLowerCase()}/${realm.toLowerCase()}/${name.toLowerCase()}`,
      });
    } else {
      setErrorText("Invalid character or realm");
    }
  };

  return (
    <Flex gap="xs">
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
        placeholder="Ceasevoker-Kazzak"
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
        style={{ width: 350 }}
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
          if (pastedText.toLowerCase().startsWith("https://raider.io/")) {
            handleRaiderIoUrl(pastedText);
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
