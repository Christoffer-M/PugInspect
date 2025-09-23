import { Autocomplete, Flex, Select } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { upperCaseFirstLetter } from "../util/util";

export const regions = ["EU", "US", "KR", "TW", "CN", "OCE", "SA", "RU"];

type CharacterSearchInputProps = {
  region?: string;
  realm?: string;
  name?: string;
};

const CharacterSearchInput: React.FC<CharacterSearchInputProps> = ({
  region: initialRegion,
  realm: initialRealm,
  name: initialName,
}) => {
  const [searchTerm, setSearchTerm] = useState(
    initialName && initialRealm
      ? `${upperCaseFirstLetter(initialName)}-${upperCaseFirstLetter(initialRealm)}`
      : "",
  );
  const [region, setRegion] = useState(
    initialRegion?.toUpperCase() || localStorage.getItem("region") || "EU",
  );
  const [errorText, setErrorText] = useState("");
  const router = useRouter();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;

      event.preventDefault(); // prevent form submit

      const trimmed = searchTerm.trim();
      if (!trimmed) return;

      const [name, realm] = trimmed.split("-", 2).map((s) => s.trim());

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
          if (errorText) setErrorText("");
          setSearchTerm(search);
        }}
        style={{ width: 350 }}
        comboboxProps={{
          transitionProps: { transition: "pop", duration: 200 },
        }}
        onKeyDown={handleKeyDown}
      />
    </Flex>
  );
};

export default CharacterSearchInput;
