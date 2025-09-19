import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";

export interface CharacterArgs {
  name: string;
  realm: string;
  region: string;
}

export default {
  Query: {
    character: async (_: any, args: CharacterArgs) => {
      const profile = await RaiderIOService.getCharacterProfile(args);

      return {
        name: args.name,
        realm: args.realm,
        region: args.region,
        raiderIoScore:
          profile.mythic_plus_scores_by_season?.[0]?.scores?.all || null,
      };
    },
    characters: async () => {
      return [];
    },
  },
};
