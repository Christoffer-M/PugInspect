import { Metric } from "@repo/graphql-types";

export type ZoneRanking = {
  bestPerformanceAverage?: number;
  medianPerformanceAverage?: number;
  difficulty?: number;
  metric?: Metric;
  partition?: number;
  zone?: number;
  size?: number;
  allStars?: {
    partition?: number;
    spec?: string;
    points?: number;
    possiblePoints?: number;
    rank?: number;
    regionRank?: number;
    serverRank?: number;
    rankPercent?: number;
    total?: number;
  }[];
  rankings?: {
    encounter?: {
      id?: number;
      name?: string;
    };
    rankPercent?: number;
    medianPercent?: number;
    lockedIn?: boolean;
    totalKills?: number;
    fastestKill?: number;
    allStars?: {
      points?: number;
      possiblePoints?: number;
      partition?: number;
      rank?: number;
      regionRank?: number;
      serverRank?: number;
      rankPercent?: number;
      total?: number;
    };
    spec?: string;
    bestSpec?: string;
    bestAmount?: number;
    bestRank?: {
      ilvl?: number;
    };
  }[];
  throughputRankings?: Record<string, {
    best_per_second_amount?: number;
    best_level?: number;
    best_historical_percentile?: number;
    median_historical_percentile?: number;
    best_historical_low_parses?: boolean;
  }>;
};
