import { QueryCharacterArgs } from "@repo/graphql-types";
import { GraphQLError } from "graphql";
import { trace } from "@opentelemetry/api";
import { BlizzardService } from "../blizzard/blizzard.services.js";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { createLogger } from "../../utils/logger.js";
import { startTimer } from "../../utils/helpers.js";

const logger = createLogger({ service: "CharacterProfile" });

type CharacterCtx = { name: string; realm: string; region: string };

// An event rather than span attributes: a roster request looks up many
// characters under one span, and each miss needs its own row in Honeycomb.
function recordUpstreamMiss(source: string, code: string, ctx: CharacterCtx) {
  trace.getActiveSpan()?.addEvent("character.upstream_miss", {
    "app.upstream": source.toLowerCase().replace(/\s+/g, "_"),
    "app.error_code": code,
    "app.character.region": ctx.region.toLowerCase(),
    "app.character.realm": ctx.realm.toLowerCase(),
    "app.character.name": ctx.name.toLowerCase(),
  });
}

// A missing character is expected user input, not a failure — and the service
// already warn-logged it with more detail, so don't log it a second time here.
function logRejection(source: string, reason: unknown, ctx: CharacterCtx) {
  const code = reason instanceof GraphQLError ? String(reason.extensions.code ?? "UNKNOWN") : "UNEXPECTED";
  recordUpstreamMiss(source, code, ctx);
  if (code === "NOT_FOUND") {
    return;
  }
  logger.error(`${source} profile failed`, {
    ...ctx,
    error: reason instanceof Error ? reason.message : String(reason),
  });
}

export async function getCharacterProfiles(
  args: QueryCharacterArgs,
  {
    raidLogsRequested,
    mythicPlusLogsRequested,
    raiderIoRequested,
    blizzardRequested,
    gearRequested,
    bypassCache,
    cacheOnly = false,
  }: { raidLogsRequested: boolean; mythicPlusLogsRequested: boolean; raiderIoRequested: boolean; blizzardRequested: boolean; gearRequested: boolean; bypassCache: boolean; cacheOnly?: boolean }
) {
  const { name, realm, region } = args;
  logger.debug("Character profile request", { name, realm, region, blizzardRequested, raidLogsRequested, mythicPlusLogsRequested, raiderIoRequested, gearRequested, bypassCache, cacheOnly });

  // Per-upstream wall clock for one character. The upstreams run in parallel,
  // so the total is roughly the slowest of them - which is exactly the question
  // worth answering when a lookup feels slow. A few milliseconds here means the
  // DB snapshot served it; hundreds means a real upstream round trip.
  const durations: Record<string, number> = {};
  const track = async <T>(upstream: string, work: Promise<T>): Promise<T> => {
    const elapsed = startTimer();
    try {
      return await work;
    } finally {
      durations[upstream] = elapsed();
    }
  };

  const total = startTimer();
  // Each call is made before track() awaits it, so wrapping preserves the
  // parallel fan-out - track only observes promises that are already running.
  const [blizzardResult, rioResult, logsResult, equipmentResult] = await Promise.allSettled([
    blizzardRequested
      ? track("blizzardMs", BlizzardService.getCharacterProfile(args, bypassCache, cacheOnly))
      : Promise.resolve(null),
    raiderIoRequested
      ? track("raiderIoMs", RaiderIOService.getCharacterProfile(args, bypassCache, cacheOnly))
      : Promise.resolve(null),
    raidLogsRequested || mythicPlusLogsRequested
      ? track("warcraftLogsMs", WarcraftLogsService.getCharacterProfile(args, bypassCache, cacheOnly))
      : Promise.resolve(null),
    gearRequested
      ? track("gearMs", BlizzardService.getCharacterEquipment(args, bypassCache, cacheOnly))
      : Promise.resolve(null),
  ]);

  logger.debug("Character profile upstreams settled", {
    name,
    realm,
    region,
    cacheOnly,
    totalMs: total(),
    ...durations,
  });

  if (blizzardResult.status === "rejected") logRejection("Blizzard", blizzardResult.reason, { name, realm, region });
  if (rioResult.status === "rejected") logRejection("RaiderIO", rioResult.reason, { name, realm, region });
  if (logsResult.status === "rejected") logRejection("WarcraftLogs", logsResult.reason, { name, realm, region });
  if (equipmentResult.status === "rejected") logRejection("Blizzard equipment", equipmentResult.reason, { name, realm, region });
  // WCL answers a missing character with a null payload, not a rejection.
  if (logsResult.status === "fulfilled" && logsResult.value && !logsResult.value.data) {
    recordUpstreamMiss("WarcraftLogs", "NOT_FOUND", { name, realm, region });
  }

  return {
    blizzardProfile: blizzardResult.status === "fulfilled" ? blizzardResult.value?.data : undefined,
    blizzardAvatarUrl: blizzardResult.status === "fulfilled" ? blizzardResult.value?.avatarUrl : undefined,
    characterId: blizzardResult.status === "fulfilled" ? (blizzardResult.value?.characterId ?? null) : null,
    rioProfile: rioResult.status === "fulfilled" ? rioResult.value?.data : undefined,
    warcraftLogsProfile: logsResult.status === "fulfilled" ? logsResult.value?.data : undefined,
    equipment: equipmentResult.status === "fulfilled" ? equipmentResult.value?.data : undefined,
  };
}
