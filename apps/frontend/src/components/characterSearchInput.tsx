import { Autocomplete, Flex, Loader, Select } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

export const regions = ["EU", "US", "KR", "TW", "CN", "OCE", "SA", "RU"];

const CharacterSearchInput: React.FC = () => {
  const [loading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [region, setRegion] = useState(localStorage.getItem("region") || "EU");
  const [errorText, setErrorText] = useState("");
  const router = useRouter();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setErrorText("");
    if (event.key === "Enter" && searchTerm.trim()) {
      const [name, server] = searchTerm.split("-");
      console.log("name, server");

      if (name && server) {
        router.navigate({
          to: "/character",
          search: { region, name, server },
        });
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
        disabled={loading}
        style={{ width: 350 }}
        comboboxProps={{
          transitionProps: { transition: "pop", duration: 200 },
        }}
        rightSection={loading ? <Loader size="xs" /> : null}
        onKeyDown={handleKeyDown}
      />
    </Flex>
  );
};

export default CharacterSearchInput;
