import { Autocomplete, Flex, Loader, Select } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CharacterQueryVariables } from "../generated/graphql";
import { useCharacterQuery } from "../queries/character-queries";

export const regions = ["EU", "US", "KR", "TW", "CN", "OCE", "SA", "RU"];

const CharacterSearchInput: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [region, setRegion] = useState(localStorage.getItem("region") || "EU");
  const [errorText, setErrorText] = useState("");
  const [queryVariables, setQueryVariables] =
    useState<CharacterQueryVariables | null>(null);
  const { data, isSuccess, isFetching, isError } = useCharacterQuery(
    queryVariables || { name: "", realm: "", region: "" },
  );
  const router = useRouter();

  useEffect(() => {
    if (isError) {
      setErrorText("Character not found");
    }
    if (isSuccess && data) {
      router.navigate({
        to: `/${data.region.toLowerCase()}/${data.realm}/${data.name}`,
      });
    }
  }, [isError, isSuccess]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setErrorText("");
    if (event.key === "Enter" && searchTerm.trim()) {
      const [name, server] = searchTerm.split("-");
      if (name && server) {
        setQueryVariables({ name, realm: server, region });
      } else {
        setErrorText("Invalid character or server");
      }
    }
  };

  return (
    <Flex gap="xs">
      <Select
        placeholder="EU"
        data={regions}
        disabled={isFetching}
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
        onChange={setSearchTerm}
        disabled={isFetching}
        style={{ width: 350 }}
        comboboxProps={{
          transitionProps: { transition: "pop", duration: 200 },
        }}
        rightSection={isFetching ? <Loader size="xs" /> : null}
        onKeyDown={handleKeyDown}
      />
    </Flex>
  );
};

export default CharacterSearchInput;
