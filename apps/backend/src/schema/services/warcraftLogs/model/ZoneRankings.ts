export type ZoneRanking = {
  bestPerformanceAverage?: number;
  medianPerformanceAverage?: number;
  difficulty?: number;
  metric?: string;
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
  }[];
};
