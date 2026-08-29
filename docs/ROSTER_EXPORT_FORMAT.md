# Roster export string format (`!PI1!`)

The contract between the PugInspect in-game addon (lives in its own repo, distributed on
CurseForge) and the web app's Roster Check page (`/roster`). The two implementations:

- **Encode (addon)**: [`docs/addon/RosterExport.lua`](addon/RosterExport.lua) — reference module, drop into the addon.
- **Decode (web)**: `apps/frontend/src/util/rosterImport.ts` — tested against a Node mirror of the encode pipeline in `rosterImport.test.ts`.

## Format

```
!PI1!<EncodeForPrint(CompressDeflate(payload))>
```

- `!PI1!` — literal prefix; the `1` is the format version. Breaking changes bump it (`!PI2!`).
- `CompressDeflate` — LibDeflate raw DEFLATE (no zlib header). The web side inflates with the
  browser-native `DecompressionStream("deflate-raw")`.
- `EncodeForPrint` — LibDeflate's 6-bit printable encoding, little-endian bit order, alphabet
  (value 0–63): `a–z`, `A–Z`, `0–9`, `(`, `)`.

## Payload

Delimited text, UTF-8:

```
region;record;record;...
record = Name-Realm:CLASSFILE:ROLE[:SPEC]
```

| Field | Source (addon) | Notes |
| --- | --- | --- |
| `region` | `GetCurrentRegion()` → `us` `kr` `eu` `tw` `cn` | lowercase |
| `Name-Realm` | `GetRaidRosterInfo` | Same-realm members have no `-Realm` suffix in-game — append the player's own `GetNormalizedRealmName()`. Realm is Blizzard-normalized ("TarrenMill"); the web side re-slugs it. |
| `CLASSFILE` | `GetRaidRosterInfo` (`fileName`) | e.g. `DEATHKNIGHT`. Display hint only — the lookup is the source of truth. |
| `ROLE` | `UnitGroupRolesAssigned` | `T` / `H` / `D`; empty when unassigned. |
| `SPEC` | optional, normally empty | Other raiders' specs need inspect round-trips — not worth it; the lookup fills spec. |

`;` and `:` never occur in character or realm names, so no escaping is needed.
Max 30 characters per export; the web side ignores extras.

## Corruption handling

There is no checksum: truncated or altered strings fail 6-bit decoding or DEFLATE inflation,
which the web side surfaces as "not a valid export string". A string that decodes but has an
unknown region or zero valid records is rejected the same way.

## Known limitation

Blizzard-normalized realm names are re-slugged heuristically (case/digit boundaries → dashes):
`TarrenMill` → `tarren-mill`, `Area52` → `area-52`. Russian realms are special-cased: their
API slugs are transliterated (`РевущийФьорд` → `howling-fjord`), so the web decoder carries a
lookup table of all 20 RU realms. Latin realms whose normalization removed an apostrophe are
still ambiguous (`MalGanis` → `mal-ganis`, but the real slug is `malganis`) and come back
"not found". Fix, if it bites: extend the table from Blizzard's realm index API.
