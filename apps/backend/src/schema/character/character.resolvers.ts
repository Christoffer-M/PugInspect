import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";

export default {
  Query: {
    character: async (
      _: any,
      {
        name,
        realm,
        region,
      }: {
        name: string;
        realm: string;
        region: string;
      }
    ) => {
      const profile = await RaiderIOService.getCharacterProfile(
        name,
        realm,
        region
      );

      return {
        name,
        realm,
        region,
        raiderIoScore:
          profile.mythic_plus_scores_by_season?.[0]?.scores?.all || null,
      };
    },
    characters: async () => {
      return [];
    },
  },
};
