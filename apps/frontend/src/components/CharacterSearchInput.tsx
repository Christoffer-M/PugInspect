import { Autocomplete, Flex, Select } from "@mantine/core";
import { useParams, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { parseRaiderIoUrl, upperCaseFirstLetter } from "../util/util";

export const regions = ["EU", "US", "KR", "TW", "CN", "OCE", "SA", "RU"];

const CharacterSearchInput: React.FC = () => {
  const params = useParams({
    from: "/$region/$realm/$name",
    shouldThrow: false,
  });

  const initialRegion = params?.region;
  const initialRealm = params?.realm;
  const initialName = params?.name;

  const [searchTerm, setSearchTerm] = useState(
    initialName && initialRealm ? `${initialName}-${initialRealm}` : "",
  );
  const [region, setRegion] = useState(
    initialRegion?.toUpperCase() || localStorage.getItem("region") || "EU",
  );

  const [errorText, setErrorText] = useState("");
  const router = useRouter();

  const handleRaiderIoUrl = (url: string) => {
    const parsed = parseRaiderIoUrl(url);
    if (parsed) {
      setSearchTerm(
        `${upperCaseFirstLetter(parsed.name)}-${upperCaseFirstLetter(parsed.realm)}`,
      );
      setRegion(parsed.region.toUpperCase());
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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;

      event.preventDefault(); // prevent form submit

      const trimmed = searchTerm.trim();
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
    },
    [searchTerm, region, router],
  );

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
        placeholder="Ceasevoker-Kazzak"
        data={[]}
        value={searchTerm}
        onChange={(search) => {
          console.log("onChange");

          if (errorText) setErrorText("");
          const trimmed = search.trim();

          if (trimmed.toLowerCase().startsWith("https://raider.io/")) {
            handleRaiderIoUrl(trimmed);
            return;
          }

          setSearchTerm(search);
        }}
        style={{ width: 350 }}
        comboboxProps={{
          transitionProps: { transition: "pop", duration: 200 },
        }}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          console.log("onPaste");

          e.stopPropagation();
        }}
      />
    </Flex>
  );
};

export default CharacterSearchInput;
