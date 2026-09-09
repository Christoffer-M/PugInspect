# Reading upstream latency from the logs

Every upstream call the backend makes carries a `durationMs` field. Logs are
one JSON object per line (`schema/utils/logger.ts`), so the question "which
upstream is slow" is answerable with `jq` against the container logs — no
tracing stack, no extra dependency.

## What is always on (info level)

One line per **real upstream call**. These fire only on a cache miss, so their
volume tracks upstream work rather than request count.

| Line | Service | Fields |
| --- | --- | --- |
| `Blizzard character profile fetched` | Blizzard | `durationMs` (profile + media, both settled) |
| `Blizzard equipment fetched` | Blizzard | `durationMs`, `iconDurationMs`, `iconMisses` |
| `Blizzard OAuth token acquired` | Blizzard | `durationMs` |
| `RaiderIO character profile fetched` | RaiderIO | `durationMs` |
| `RaiderIO character suggestions fetched` | RaiderIO | `durationMs`, `count` |
| `WarcraftLogs character profile fetched` | WarcraftLogs | `durationMs`, `rateLimit` |
| `Roster chunk resolved` | Roster | `totalMs`, `maxPhase1Ms`, `maxPhase2Ms`, `characters` |

Failure and not-found lines carry `durationMs` too, so a slow *timeout* is
visible rather than being dropped from the sample — a service that always fails
at 10s would otherwise look like it has no latency at all.

`Roster chunk resolved` is one line per chunk request (not per character),
which is what makes it cheap enough to leave on.

## Answering "which upstream is slow"

Median and p95 per service, over the whole log:

```bash
docker compose logs backend --no-log-prefix \
  | jq -rs '
      map(select(.durationMs != null))
      | group_by(.service)
      | map({
          service: .[0].service,
          calls: length,
          p50: (sort_by(.durationMs) | .[length / 2 | floor].durationMs),
          p95: (sort_by(.durationMs) | .[length * 0.95 | floor].durationMs),
          max: (max_by(.durationMs).durationMs)
        })'
```

The slowest calls, with their context:

```bash
docker compose logs backend --no-log-prefix \
  | jq -rs 'map(select(.durationMs != null)) | sort_by(-.durationMs) | .[:20]
            | .[] | "\(.durationMs)ms  \(.service)  \(.message)  \(.name // "")"'
```

Roster page latency specifically:

```bash
docker compose logs backend --no-log-prefix \
  | jq -r 'select(.message == "Roster chunk resolved")
           | "\(.totalMs)ms  phase1=\(.maxPhase1Ms) phase2=\(.maxPhase2Ms)  n=\(.characters)"'
```

`maxPhase1Ms` covers identity plus RaiderIO; `maxPhase2Ms` covers the
WarcraftLogs parses, which are sequenced after phase 1 per character (phase 1
supplies the role that picks the WCL metric). A chunk whose `totalMs` is
dominated by `maxPhase1Ms` is waiting on Blizzard or RaiderIO; one dominated by
`maxPhase2Ms` is waiting on WarcraftLogs.

## What needs LOG_LEVEL=debug

`Character profile upstreams settled` gives the per-character parallel
breakdown — `blizzardMs`, `raiderIoMs`, `warcraftLogsMs`, `gearMs` and
`totalMs` — including calls served from the DB snapshot (single-digit
milliseconds) rather than only real upstream calls. It is one line per
character per request, which is why it is not on by default: a 30-man roster
load would emit ~90 of them.

Enable it by setting `LOG_LEVEL=debug` and restarting the backend. Note that
this also turns on every other debug line (resolver entries, cache hits), so
turn it back off once you have your sample — the container log is capped and
debug chatter will rotate real signals out of it.

## Interpreting the numbers

- **Single-digit ms** — served from the Postgres snapshot, not upstream.
- **`iconMisses` above zero on most requests** — the in-process item-icon cache
  is cold or churning. It re-warms after every restart, up to 16 parallel
  fetches per character; if `iconDurationMs` is routinely a large share of the
  gear panel's latency, that cache belongs in a table.
- **`Blizzard OAuth token acquired` appearing often** — tokens are being
  refetched rather than reused, and its `durationMs` is added to the first
  request behind it.
- **A service with few calls but a high p95** — check its failure lines before
  concluding it is slow; timeouts land at the client timeout (10s for
  Blizzard/RaiderIO, 15s for WarcraftLogs) and will dominate a small sample.
