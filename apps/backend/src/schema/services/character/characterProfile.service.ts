import { QueryCharacterArgs } from "@repo/graphql-types";
import { GraphQLError } from "graphql";
import { trace } from "@opentelemetry/api";
import { BlizzardService } from "../blizzard/blizzard.services.js";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";

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

// The underlying error is already on the span: the services record it before
// translating it into a GraphQLError, so only the code is added here.
function recordRejection(source: string, reason: unknown, ctx: CharacterCtx) {
  const code = reason instanceof GraphQLError ? String(reason.extensions.code ?? "UNKNOWN") : "UNEXPECTED";
  recordUpstreamMiss(source, code, ctx);
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

  const [blizzardResult, rioResult, logsResult, equipmentResult] = await Promise.allSettled([
    blizzardRequested
      ? BlizzardService.getCharacterProfile(args, bypassCache, cacheOnly)
      : Promise.resolve(null),
    raiderIoRequested
      ? RaiderIOService.getCharacterProfile(args, bypassCache, cacheOnly)
      : Promise.resolve(null),
    raidLogsRequested || mythicPlusLogsRequested
      ? WarcraftLogsService.getCharacterProfile(args, bypassCache, cacheOnly)
      : Promise.resolve(null),
    gearRequested
      ? BlizzardService.getCharacterEquipment(args, bypassCache, cacheOnly)
      : Promise.resolve(null),
  ]);

  if (blizzardResult.status === "rejected") recordRejection("Blizzard", blizzardResult.reason, { name, realm, region });
  if (rioResult.status === "rejected") recordRejection("RaiderIO", rioResult.reason, { name, realm, region });
  if (logsResult.status === "rejected") recordRejection("WarcraftLogs", logsResult.reason, { name, realm, region });
  if (equipmentResult.status === "rejected") recordRejection("Blizzard equipment", equipmentResult.reason, { name, realm, region });
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
