# Companion telemetry

The companion posts one beat every 30 minutes to `POST /api/companion/beat`
while it runs, gated on the "Send anonymous usage statistics" setting. Two
tables back it (`apps/backend/src/db/schema.ts`):

- `companion_installs` — one row per install, upserted per beat, dropped 24
  months after the install goes quiet.
- `companion_beats` — one row per beat, pruned at 90 days.

`./scripts/telemetry.sh [installs|versions|health|retention|usage]` runs the
reports below against the running stack. Prod Postgres is not published off the
compose network, so run it on the host. Keep the script and this file in step.

Umami is still the website's analytics and is not involved here. It cannot
count installs: its visitor id is a hash of IP + user-agent under a
daily-rotating salt, and two Tauri webviews on Windows are indistinguishable.

There is deliberately no dashboard yet — the script and the queries below are
it. Build a `/stats` panel when a curve is worth looking at.

The beat endpoint is deliberately not behind `COMPANION_MIN_VERSION`: it spends
no upstream quota, and gating it would silence exactly the stranded installs
this data exists to find. The emergency lever for it is the Cloudflare WAF rule
in `COMPANION_ABUSE_RUNBOOK.md`, which matches the path alone.

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

```sql
-- Stranded installs: they know a newer build exists and still have not taken it.
-- On Windows a successful update relaunches the app, so success never reaches a
-- beat — update_pending and update_failures are the only view of the updater.
select b.version, b.update_pending, count(distinct b.install_id) as installs,
       sum(b.update_failures) as failed_attempts
from companion_beats b
where b.at > now() - interval '7 days' and b.update_pending is not null
group by 1, 2 order by installs desc;
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
(`src-tauri/src/pixel.rs`, needs plumbing from Rust to the beat) and clean-exit
detection to tell crashes from quits.
