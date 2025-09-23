import { Difficulty, InputMaybe } from "@repo/graphql-types";

export const mapDifficultyIdToName = (
  difficulty?: number | InputMaybe<number>
): Difficulty | null => {
  switch (difficulty) {
    case 1:
      return "LFR";
    case 3:
      return "Normal";
    case 4:
      return "Heroic";
    case 5:
      return "Mythic";
    default:
      return null;
  }
};
