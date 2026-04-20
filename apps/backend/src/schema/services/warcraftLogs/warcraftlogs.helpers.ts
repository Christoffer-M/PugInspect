import type { InputMaybe } from "./generated/index.js";
import type { Difficulty, QueryCharacterArgs } from "@repo/graphql-types";

export function mapDifficulty(difficulty?: InputMaybe<Difficulty>): number | undefined {
  switch (difficulty) {
    case "LFR":    return 1;
    case "Normal": return 3;
    case "Heroic": return 4;
    case "Mythic": return 5;
    default:       return undefined;
  }
}

export function buildProfileParams(
  args: Pick<QueryCharacterArgs, "zoneId" | "difficulty" | "metric" | "role" | "byBracket">,
  partition: number | undefined
) {
  return {
    zoneId:     args.zoneId     ?? 0,
    difficulty: args.difficulty ?? "",
    metric:     args.metric     ?? "",
    role:       args.role       ?? "",
    byBracket:  args.byBracket  ?? false,
    partition:  partition       ?? 0,
  };
}
