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

## Realm slugs

Blizzard-normalized realm names (`TarrenMill`, `DerRatvonDalaran`, `РевущийФьорд`) are the
name in the PLAYER's locale with separators stripped, so they are looked up in
`REALM_SLUGS` — generated from Blizzard's realm index for every region and locale by
`pnpm season:update`, and refreshed daily by the season-config workflow.

Lookups take the **region** as well as the name, because names are not unique across
regions: `Spirestone` is a US and TW realm and also the ru_RU name of EU's
`colinas-pardas`, so a Russian-client player on Colinas Pardas genuinely sends
`Spirestone`. Both mappings are real and only the region separates them.

**The backend is authoritative.** `resolveRealm` runs at every entry point — the character
and roster resolvers, and the `/meta` and `/card` routes — so whatever a client sends is
canonical before it reaches an upstream, the `characters` table, or the sitemap. Clients
slug too (`slugRealm` in `@repo/ui`), but only to build links and labels; a stale client
table can no longer write a bad realm. See #94 for removing the client copy entirely.

A realm missing from the table (opened since the last regeneration) is **not rejected** —
it falls through to `normalizeRealm`, because the table is only as fresh as the last deploy
and a new realm is exactly when someone is looking up a real character. Such realms are
left out of the sitemap, since we can't vouch for the URL. Client-side, the fallback is the
old case-boundary heuristic, which is wrong for any realm containing a lowercase word —
`DerRatvonDalaran` → `der-ratvon-dalaran` — so run `pnpm season:update` rather than
hand-patching when one surfaces.
