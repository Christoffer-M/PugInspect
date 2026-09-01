// No "cn": Blizzard's China API is a separate deployment (oauth.battlenet.com.cn +
// gateway.battlenet.com.cn) that rejects global client credentials, and
// cn.api.blizzard.com / cn.battle.net don't resolve at all. Add it back only
// alongside CN-issued credentials and per-region host mapping.
export const VALID_REGIONS = new Set(["eu", "us", "kr", "tw"]);
