# CONCEPT_BRIEF — PugInspect

**Status:** LOCKED  
**Last updated:** 2026-06-24  
**Mode:** Refinement (existing project)

---

## What it is

PugInspect is a WoW character inspection aggregator at [puginspect.com](https://puginspect.com). It pulls from three APIs — Blizzard, Raider.IO, and WarcraftLogs — and displays character identity, M+ scores, raid parses, dungeon rankings, best/recent runs, and raid progression in one clean page. The tech is solid (React 19, Apollo GraphQL, Postgres caching, Turborepo monorepo). The original pain it was built to solve: stop jumping between RIO, WCL, and armory when vetting strangers for M+ or raid.

---

## Honest assessment

**Score: 6/10.** Well-built tool, quiet distribution. It solves the aggregation problem but not the *speed-of-decision* problem. The data is all there — but scattered across sections in a layout designed for deep inspection, not fast vetting. The site is visited alone and leaves no trail in the communities where group leaders actually operate (Discord, Reddit, guild chats). The growth loop is absent.

**Verdict: iterate.** The bones are excellent. The missing piece is a surface that lets PugInspect travel.

---

## The locked concept

> **PugInspect is the fastest character vetting tool for WoW group leaders.**  
> It does not tell you if a player is good. It removes the assembly work so you can decide in 5 seconds instead of 45.

### Core insight

The real pain is not "I need more data." It's "I have to mentally cross-reference three sites to form an opinion, and that takes too long per applicant." The fix is not an algorithm — it's **better signal layout and shareability.** Human judgment stays with the group leader; PugInspect removes the friction.

### Why no verdict badge

A readiness algorithm was considered and rejected:
- Accuracy requires too many variables (season timing, spec-specific parse floors, affixes, build quality)
- Confidently wrong verdicts damage trust more than no verdict
- Politically loaded — WoW players push back hard on black-box scores
- Would require significantly more eager API calls (WCL gear, talent data, etc.)

---

## Beachhead persona

**LOCKED:** Guild officer or M+ group leader, EU/US servers, actively forming groups weekly. Checks 3–10 applicants per session. Currently uses Raider.IO + WarcraftLogs + armory in separate tabs. Time-constrained; wants to make a call fast and move on.

---

## The wedge — LOCKED

Neither Raider.IO nor WarcraftLogs surfaces a compact, scannable vetting view. WarcraftLogs is complex and deep. Raider.IO shows raw scores but buries progression and parses. Neither generates a shareable embed card for Discord.

PugInspect's wedge: **the right signals, in one glance, shareable anywhere.**

---

## Success metric — LOCKED

Weekly active users (WAU) triples within 6 months of shipping Phase 1 + Phase 2.  
Secondary signal: average characters inspected per session rises above 1.5 (indicating multi-character vetting workflows, not just one-off lookups).

## Kill criterion — LOCKED

If 8 weeks after the Discord card ships, organic referral traffic hasn't moved and session depth is still ~1.0, the viral loop is not working and the direction needs a fundamental rethink.

---

## Scope — LOCKED

### IN
- Discord embed card (og:image per character URL)
- Compact vetting summary card (header redesign — all decision signals above the fold)
- Multi-character compare view

### OUT (deferred — named, not forgotten)
- Readiness/verdict algorithm
- Realm leaderboards (needs background crawl jobs, doesn't fit current infra)
- Guild roster inspector (expensive: loops all members via Blizzard API)
- PvP data
- Notification / character tracking / watchlist
- OCE/SA/RU region support (blocked on Raider.IO API limitations)

---

## Monetization / sustainability — LOCKED

Free / open source. No pricing hypothesis. Sustainability via community goodwill and low infra cost (existing cloud instance handles the load). If WAU grows significantly, revisit whether a "PugInspect Pro" tier (saved comparisons, roster tracking) makes sense — but do not build for it now.

---

## Phased roadmap

### Phase 1 — Make it travel (Discord card)
**Goal:** Every shared PugInspect link becomes its own ad.

- Generate a server-side `og:image` per character using Satori (or similar canvas renderer in the Node backend)
- Card contents: character avatar, class/spec, ilvl, current RIO score (color-coded), highest timed key, raid progression summary (e.g. "4/8 M"), best WCL parse %, faction/realm/region
- Wire up proper `<meta og:image>` and `<meta twitter:card>` tags per character route (the `characterMeta.ts` SEO file is already in the backend — extend it)
- Test in Discord, Twitter/X, Reddit

**Effort estimate:** ~3–5 days. No new external API calls needed — all data already fetched on character load. The image generation is pure backend work.

**Why first:** Every share is free distribution. This is the growth flywheel with the lowest build cost.

---

### Phase 2 — Fix the vetting layout (compact signal card)
**Goal:** A group leader can form an opinion in one glance without scrolling.

Current layout scatters decision signals across sections. The redesigned character header should surface all of these above the fold in a compact, scannable card:

| Signal | Source | Currently |
|---|---|---|
| Equipped ilvl | Blizzard | ✓ header |
| Current season RIO score | Raider.IO | ✓ header (stat strip) |
| Highest timed key | Raider.IO | ✓ header (stat strip) |
| Raid progression summary | Raider.IO | Raid progression section, below fold |
| Best WCL parse % (current tier) | WarcraftLogs | Buried in logs table |
| Last active | Raider.IO (derive from most recent run `completed_at`) | Not shown |

"Last active" is derivable from the most recent run's `completed_at` timestamp — already in the RaiderIO data model. No new API call needed.

**Effort estimate:** ~2–3 days. Pure frontend layout work in `CharacterHeader.tsx` and supporting components. No backend changes.

---

### Phase 3 — Multi-character compare
**Goal:** Vet a shortlist of applicants side by side in one view without opening multiple tabs.

- Route: `/compare?chars=eu/kazzak/ceases,eu/kazzak/other,us/stormrage/someone`
- UI: a compact comparison table, one row per character, same signal columns as Phase 2
- Each character loads its own query in parallel (TanStack Query already handles this)
- Shareable URL — paste the whole comparison in Discord
- Max 4–5 characters to keep API load reasonable

**Effort estimate:** ~4–6 days. New route, new query orchestration, new comparison table component. Backend unchanged — character query already exists, just fire it N times.

---

## Aha / activation moment — LOCKED

A group leader pastes a PugInspect link in their guild Discord. The embed card appears — class art, ilvl, RIO score, top key, raid prog. Someone clicks it, checks two more applicants using the compare view, shares that link too. Three people in the server now know PugInspect exists.

**The activation moment is the first Discord embed that someone didn't create intentionally — they just pasted a link.**

---

## Top risks

1. **og:image generation performance** — image rendering must be fast (< 500ms) or it degrades the Discord embed experience. Satori is generally fast; cache the generated image in Postgres alongside the character snapshot.
2. **WCL data not always present** — some characters have no WarcraftLogs data. The Phase 2 card must degrade gracefully (show "—" not a broken layout).
3. **Compare view API load** — 4 parallel character queries means up to 4× the upstream API calls simultaneously. Lean on the existing Postgres cache; add a short rate-limit or queue if needed.
4. **Phase 2 layout regression** — the current header is clean. Redesigning it risks cluttering. Enforce a strict "above the fold, no more than 6 signals" constraint.

---

## Tech notes

- **og:image generation:** Add a `/card/:region/:realm/:name` endpoint to the Express backend. Use `@vercel/satori` (works in Node without a browser). Render character data as an HTML/JSX template → PNG. Cache the PNG blob in Postgres with the same TTL as the character snapshot.
- **Meta tags:** `apps/backend/src/seo/characterMeta.ts` already exists — extend it to include `og:image` pointing at the card endpoint.
- **Compare route:** New TanStack Router file `apps/frontend/src/routes/compare.tsx`. Query params: `chars` (comma-separated `region/realm/name` slugs).
- **Last active:** Derive from `Math.max(...bestRuns.map(r => new Date(r.completed_at).getTime()))` — already in the Raider.IO response.

---

## Handoff

Brief path: `docs/CONCEPT_BRIEF.md`  
Ready for `prompt-pack` to sequence build prompts for Phase 1 → 2 → 3.
