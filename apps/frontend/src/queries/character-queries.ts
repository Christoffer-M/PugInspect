import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./util";

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
      const response = await fetcher(
        `${process.env.API_BASE_URL}/character?name=${name}&realm=${realm}&region=${region}`,
      );
      return response;
    },
    enabled: !!name && !!realm && !!region,
  });
};
