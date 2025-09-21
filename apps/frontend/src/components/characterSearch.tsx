import { Autocomplete, Flex, Loader, Select } from "@mantine/core";
import { useState } from "react";

const regions = ["EU", "US", "KR", "TW", "CN", "OCE", "SA", "RU"];

const CharacterSearch: React.FC = () => {
  const [loading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [region, setRegion] = useState(localStorage.getItem("region") || "EU");

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
      />
    </Flex>
  );
};

export default CharacterSearch;
