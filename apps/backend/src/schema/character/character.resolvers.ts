import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";

export interface CharacterArgs {
  name: string;
  realm: string;
  region: string;
}

export default {
  Query: {
    character: async (_: any, args: CharacterArgs) => {
      const [rioProfile, warcraftLogsProfile] = await Promise.all([
        RaiderIOService.getCharacterProfile(args),
        WarcraftLogsService.getCharacterProfile(
          args.name,
          args.realm,
          args.region
        ),
      ]);

      if (!warcraftLogsProfile?.character) {
        throw new Error("Character not found in Warcraft Logs");
      }

      return {
        name: args.name,
        realm: args.realm,
        region: args.region,
        raiderIoScore:
          rioProfile.mythic_plus_scores_by_season?.[0]?.scores?.all || null,
        warcraftLogsName: warcraftLogsProfile?.character?.name || null,
      };
    },
    characters: async () => {
      return [];
    },
  },
};
