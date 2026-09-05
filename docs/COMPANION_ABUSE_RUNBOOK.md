# Runbook: companion app overloading the backend

What to do when desktop-companion traffic threatens the site — WCL quota
burning down, `/graphql` flooded, or a bad companion release stuck in a
request loop. Every upstream call (WarcraftLogs above all) runs on a single
shared API client, so runaway companion traffic degrades the website too.

## How you find out

Watch the backend logs for these structured lines:

| Log line | Meaning |
|---|---|
| `GraphQL request { operation, source }` | One per operation; `source` is `companion`, `website`, or `bot`. A flood of `source: companion` identifies the culprit. |
| `WCL_QUOTA_HIGH` | More than 80% of the hourly WarcraftLogs point quota is spent. Trouble is close. |
| `WCL_CIRCUIT_OPENED` | Quota exhausted or 429 — all WCL calls stop for 2 min, site-wide. You're now degraded. |

`source` comes from the `X-PugInspect-Client: companion/<version>` header the
companion sends. It is spoofable — attribution and incident response for our
own clients, not access control.

## Levers, fastest first

### 1. Cloudflare WAF rule — instant, blunt

A pre-created, **disabled** rule sits in the Cloudflare dashboard:
**puginspect.com zone → Security → WAF → Custom rules →
"Block companion app (emergency)"**. Flipping it on blocks all companion
traffic at the edge — no deploy, no restart, website untouched.

Expression (recreate if missing; action **Block**, keep it disabled until
needed):

```
http.request.uri.path eq "/api/companion/beat"
or (http.request.uri.path eq "/graphql" and starts_with(http.request.headers["x-puginspect-client"][0], "companion"))
```

The telemetry path is matched on the path alone, with no client header: a
custom header is not CORS-safelisted and would force a preflight the endpoint
does not answer, dropping every beat (see PR #69). Nothing but the companion
posts there, so the path is identification enough.

Caveat: companion builds older than v0.2.0 (pre-header) don't match the
`/graphql` clause. If old builds are the problem, use lever 2, or a temporary
Cloudflare rate-limiting rule on `/graphql`.

### 2. `COMPANION_MIN_VERSION` — precise, needs a restart

Set the env var on the backend and restart:

```
COMPANION_MIN_VERSION=0.2.0
```

Companion builds *older* than that version get a 403 from `/graphql` before
any resolver runs or upstream quota is spent. Builds that predate the version
header count as `0.0.0`, so any value also blocks those. Old builds show the
user a bare "HTTP 403"; the in-app auto-updater carries them forward.

Use this to cut off a specific bad release while newer builds keep working —
set it to the version *after* the bad one. Unset it (and restart) to lift.

This gate covers `/graphql` only, deliberately. `/api/companion/beat` spends no
upstream quota — it is one bounded insert — and 403-ing it would silence
exactly the stranded installs that `activated_at` and `update_pending` exist to
find. Lever 1 is the emergency control for that path.

### 3. Always-on backstops — nothing to flip

- Per-IP rate limit: 100 requests/min on `/graphql` (in-memory, per backend
  process — N× looser if ever scaled horizontally).
- WCL circuit breaker: 2-min pause on any 429/quota error.
- 15-min DB cache on WCL profiles + in-flight dedup.
- Roster queries capped at 10 characters, 5 upstream lookups in flight.

## Playbook

1. Confirm attribution: grep recent logs for `"source":"companion"` volume vs
   `website`. Don't block on a hunch — a quota spike can also be the hourly
   M+ crawl or a bot wave (`source: bot` is served cache-only already).
2. Bleeding badly → enable the Cloudflare rule (lever 1). Stops it in
   seconds.
3. Identify the bad version from the `X-PugInspect-Client` header in
   Cloudflare analytics or access logs, ship a fixed release if the bug is
   ours, then set `COMPANION_MIN_VERSION` (lever 2) to block the bad build
   precisely.
4. Disable the Cloudflare rule again so healthy companion versions resume.
5. Afterwards: keep `COMPANION_MIN_VERSION` set until the auto-updater has
   drained the old version from the wild, then unset it.

## Where the pieces live

- Companion header: `apps/companion/src/api.ts` (version injected from
  `package.json` via `vite.config.ts`).
- Source attribution + request log: `apps/backend/src/index.ts` (Apollo
  context + `requestDidStart` plugin).
- Version gate: `companionGate` in `apps/backend/src/index.ts`; config in
  `apps/backend/src/config/index.ts`.
- Quota warning: `WCL_QUOTA_HIGH` in
  `apps/backend/src/schema/services/warcraftLogs/warcraftlogs.services.ts`.
- Circuit breaker: `apps/backend/src/schema/services/warcraftLogs/wclGraphQLClient.ts`.
