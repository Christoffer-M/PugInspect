import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import { ZonePartitionsQuery, ZonePartitionsQueryVariables } from "../graphql/graphql";

const query = graphql(`
  query ZonePartitions($zoneId: Int!) {
    zonePartitions(zoneId: $zoneId) {
      id
      name
      compactName
      isDefault
    }
  }
`);

export type ZonePartition = ZonePartitionsQuery["zonePartitions"][number];

export const useZonePartitions = (zoneId: number | undefined) =>
  useQuery({
    queryKey: ["zonePartitions", zoneId],
    enabled: zoneId != null,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<ZonePartitionsQuery["zonePartitions"]> => {
      const response = await execute<ZonePartitionsQuery, ZonePartitionsQueryVariables>(query, {
        zoneId: zoneId!,
      });
      return response.zonePartitions ?? [];
    },
  });
