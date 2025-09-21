import { useQuery } from "@tanstack/react-query";

const queryKeys = {
  character: (name: string, realm: string, region: string) =>
    ["character", name, realm, region] as const,
};

export const useCharacterQuery = (
  name: string,
  realm: string,
  region: string,
) => {
  return useQuery({
    queryKey: queryKeys.character(name, realm, region),
    queryFn: async () => {
      const response = await fetch(
        `/api/character?name=${encodeURIComponent(
          name,
        )}&realm=${encodeURIComponent(realm)}&region=${encodeURIComponent(
          region,
        )}`,
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: !!name && !!realm && !!region,
  });
};
