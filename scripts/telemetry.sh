#!/usr/bin/env bash
# Companion telemetry queries, so looking at the numbers is one command instead
# of an ssh plus a docker exec plus a pasted multi-line query. Run on the host
# that runs the stack; prod Postgres is not published off the compose network.
#
#   ./scripts/telemetry.sh              # every report
#   ./scripts/telemetry.sh installs     # just one
#
# The queries themselves are documented, with the reasoning, in
# docs/COMPANION_TELEMETRY.md -- keep the two in step.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

q() { docker compose exec -T postgres psql -U puginspect -d puginspect -X -q -c "$1"; }

installs() {
  echo "== Install base =="
  q "select count(*) as installs,
            count(*) filter (where last_seen > now() - interval '1 day')   as dau,
            count(*) filter (where last_seen > now() - interval '7 days')  as wau,
            count(*) filter (where last_seen > now() - interval '30 days') as mau,
            count(*) filter (where activated_at is null)                   as never_activated
     from companion_installs;"
}

versions() {
  echo "== Versions in use (last 7 days), and who is stuck =="
  q "select version,
            count(*) as installs,
            count(*) filter (where update_pending is not null) as knows_of_newer
     from companion_installs i
     left join lateral (
       select update_pending from companion_beats b
       where b.install_id = i.install_id order by at desc limit 1
     ) latest on true
     where last_seen > now() - interval '7 days'
     group by version order by installs desc;"
}

health() {
  echo "== Where installs are stuck (last 7 days) =="
  q "select link, count(*),
            round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
     from companion_beats where at > now() - interval '7 days'
     group by link order by count(*) desc;"
  echo "== Lookup and updater failures (last 7 days) =="
  q "select sum(lookups) as lookups, sum(lookup_errors) as lookup_errors,
            sum(not_found) as not_found, sum(update_failures) as update_failures
     from companion_beats where at > now() - interval '7 days';"
}

retention() {
  echo "== Return rate by weekly cohort =="
  q "select date_trunc('week', first_seen)::date as cohort,
            count(*) as size,
            count(*) filter (where last_seen >= first_seen + interval '7 days')  as back_d7,
            count(*) filter (where last_seen >= first_seen + interval '30 days') as back_d30
     from companion_installs group by 1 order by 1 desc;"
}

usage() {
  echo "== Listings by type (last 30 days), and how often the 20-strip cap bites =="
  q "select listing, count(*),
            count(*) filter (where total > applicants) as over_cap
     from companion_beats
     where at > now() - interval '30 days' and listing <> ''
     group by listing order by count(*) desc;"
  echo "== Settings actually enabled (last 7 days) =="
  q "select key, count(*) filter (where value = 'true') as enabled, count(*) as beats
     from companion_beats, jsonb_each_text(settings)
     where at > now() - interval '7 days' group by key order by key;"
}

case "${1:-all}" in
  installs)  installs ;;
  versions)  versions ;;
  health)    health ;;
  retention) retention ;;
  usage)     usage ;;
  all)       installs; versions; health; retention; usage ;;
  *) echo "usage: $0 [installs|versions|health|retention|usage|all]" >&2; exit 2 ;;
esac
