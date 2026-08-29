# Roster export string format (`!PI1!`)

The contract between the PugInspect in-game addon (lives in its own repo, distributed on
CurseForge) and the web app's Roster Check page (`/roster`). The two implementations:

- **Encode (addon)**: lives in the addon repo - LibDeflate `CompressDeflate` + `EncodeForPrint` over the payload below.
- **Decode (web)**: `apps/frontend/src/util/rosterImport.ts` - tested against a Node mirror of the encode pipeline in `rosterImport.test.ts`.

## Format

```
!PI1!<EncodeForPrint(CompressDeflate(payload))>
```

- `!PI1!` - literal prefix; the `1` is the format version. Breaking changes bump it (`!PI2!`).
- `CompressDeflate` - LibDeflate raw DEFLATE (no zlib header). The web side inflates with the
  browser-native `DecompressionStream("deflate-raw")`.
- `EncodeForPrint` - LibDeflate's 6-bit printable encoding, little-endian bit order, alphabet
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
| `Name-Realm` | `GetRaidRosterInfo` | Same-realm members have no `-Realm` suffix in-game - append the player's own `GetNormalizedRealmName()`. Realm is Blizzard-normalized ("TarrenMill"); the web side re-slugs it. |
| `CLASSFILE` | `GetRaidRosterInfo` (`fileName`) | e.g. `DEATHKNIGHT`. Display hint only - the lookup is the source of truth. |
| `ROLE` | `UnitGroupRolesAssigned` | `T` / `H` / `D`; empty when unassigned. |
| `SPEC` | optional, normally empty | Other raiders' specs need inspect round-trips - not worth it; the lookup fills spec. |

`;` and `:` never occur in character or realm names, so no escaping is needed.
Max 30 characters per export; the web side ignores extras.

## Corruption handling

There is no checksum: truncated or altered strings fail 6-bit decoding or DEFLATE inflation,
which the web side surfaces as "not a valid export string". A string that decodes but has an
unknown region or zero valid records is rejected the same way.

## Known limitation

Blizzard-normalized realm names are re-slugged heuristically (case/digit boundaries → dashes):
`TarrenMill` → `tarren-mill`, `Area52` → `area-52`. Realms the heuristic can't derive are
special-cased in a lookup table (`SPECIAL_REALM_SLUGS`): all 20 Russian realms, whose API
slugs are transliterated (`РевущийФьорд` → `howling-fjord`), and apostrophe realms whose
stripped apostrophe left a case boundary (`MalGanis` → `malganis`, `KelThuzad` →
`kelthuzad`). A realm missing from the table comes back "not found" - extend the table
(or replace it with Blizzard's realm index API) when one surfaces.
