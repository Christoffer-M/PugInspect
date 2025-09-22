import { RoleType } from "./graphql/graphql";

export const queryKeys = {
  character: (name: string, realm: string, region: string) => [
    "character",
    name,
    realm,
    region,
  ],
  characterLogs: (
    name: string,
    realm: string,
    region: string,
    role: RoleType,
  ) => ["characterLogs", name, realm, region, role],
};
