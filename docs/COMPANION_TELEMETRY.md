# Companion telemetry

The companion posts one beat every 30 minutes to `POST /api/companion/beat`
while it runs, gated on the "Send anonymous usage statistics" setting. Two
tables back it (`apps/backend/src/db/schema.ts`):

- `companion_installs` — one row per install, upserted per beat, never pruned.
- `companion_beats` — one row per beat, pruned at 90 days.

Umami is still the website's analytics and is not involved here. It cannot
count installs: its visitor id is a hash of IP + user-agent under a
daily-rotating salt, and two Tauri webviews on Windows are indistinguishable.

There is deliberately no dashboard yet — the queries below are it. Build a
`/stats` panel when a curve is worth looking at.

## Install base

```sql
-- Total, and how many are still alive.
select count(*)                                                    as installs,
       count(*) filter (where last_seen > now() - interval '1 day')  as dau,
       count(*) filter (where last_seen > now() - interval '7 days') as wau,
       count(*) filter (where last_seen > now() - interval '30 days')as mau,
       count(*) filter (where activated_at is null)                  as never_activated
from companion_installs;
```

`never_activated` is the important one: installs that never decoded a single
frame. The strip is off until the player types `/pi hud`, so this is the
expected drop-off and the number to drive down.

```sql
-- New installs per day.
select date_trunc('day', first_seen)::date as day, count(*)
from companion_installs group by 1 order by 1 desc limit 30;
```

```sql
-- Version adoption right now — how fast the auto-updater actually lands.
select version, count(*) from companion_installs
where last_seen > now() - interval '7 days' group by 1 order by 2 desc;
```

Cross-check installs against downloads for the uninstall/opt-out gap:
`gh api repos/Christoffer-M/PugInspect/releases --jq '.[].assets[] | select(.name|endswith(".exe")) | "\(.name) \(.download_count)"'`

## Usage

```sql
-- Sessions: consecutive beats less than 45 min apart are one run of the app.
with gaps as (
  select install_id, at,
         at - lag(at) over (partition by install_id order by at) as since_prev
  from companion_beats where at > now() - interval '30 days'
), runs as (
  select install_id, at,
         count(*) filter (where since_prev is null or since_prev > interval '45 minutes')
           over (partition by install_id order by at) as run
  from gaps
)
select install_id, run, min(at) as started,
       max(at) - min(at) as duration
from runs group by 1, 2 order by started desc;
```

Duration is a floor: it measures first beat to last, so anything under 30
minutes reads as zero. Fine for "did they run it through a raid night".

```sql
-- When is the app actually used (UTC hour of day)?
select extract(hour from at) as hour, count(*) from companion_beats
where at > now() - interval '30 days' group by 1 order by 1;
```

## Retention

```sql
-- Day-N return rate by weekly signup cohort.
select date_trunc('week', i.first_seen)::date as cohort,
       count(distinct i.install_id) as size,
       count(distinct i.install_id) filter (
         where i.last_seen >= i.first_seen + interval '7 days') as back_d7,
       count(distinct i.install_id) filter (
         where i.last_seen >= i.first_seen + interval '30 days') as back_d30
from companion_installs i group by 1 order by 1 desc;
```

## Health

```sql
-- Where installs are stuck. no_window dominating means setup is failing.
select link, count(*), round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from companion_beats where at > now() - interval '7 days' group by 1 order by 2 desc;
```

```sql
-- Lookup failure rate, and how often the backend has no data for an applicant.
select sum(lookups) as lookups, sum(lookup_errors) as errors, sum(not_found) as not_found,
       round(100.0 * sum(lookup_errors) / nullif(sum(lookups), 0), 2) as error_pct
from companion_beats where at > now() - interval '7 days';
```

```sql
-- Raid vs keys, and how often the 20-applicant strip cap bites.
select listing, count(*), count(*) filter (where total > applicants) as over_cap
from companion_beats where at > now() - interval '30 days' and listing <> ''
group by 1 order by 2 desc;
```

## Feature usage

```sql
-- Which settings are load-bearing. Anything at 0% is deletable.
select key, count(*) filter (where value = 'true') as on, count(*) as total
from companion_beats, jsonb_each_text(settings)
where at > now() - interval '7 days' group by 1 order by 1;
```

## Not collected

Character names, realms, listing titles, applicant identity, IP addresses.
`install_id` is a random UUID with nothing derived from the machine, and the
privacy policy names it. Raw IP is resolved to a country at the edge by
Cloudflare (`cf-ipcountry`) and discarded.

Not yet instrumented, in rough order of value: pixel-decode CRC failure rate
(`src-tauri/src/pixel.rs`, needs plumbing from Rust to the beat), updater
outcomes (`src/updates.ts` currently swallows failures into `console.warn`),
and clean-exit detection to tell crashes from quits.
