# Prompt: add roster export to the PugInspect addon

Copy everything below the line into a session working on the PugInspect addon repo.

---

Add a **roster export** feature to the PugInspect World of Warcraft addon. The PugInspect
website now has a Roster Check page (`https://puginspect.com/roster`) where a user pastes an
export string produced by this addon; the site then looks up every raid member at once. Your
job is only the addon side: produce the string and make it easy to copy.

## What to build

1. **Bundle LibDeflate** (if not already present): vendor `LibDeflate.lua` under `Libs/`,
   list it in the `.toc` / embeds.xml the way the addon's other libraries are handled. It's
   the standard LibStub library used by WeakAuras/Details for export strings.

2. **Export module** - use this reference implementation as the starting point (adapt naming
   to the addon's existing module/namespace conventions):

```lua
local LibDeflate = LibStub and LibStub:GetLibrary("LibDeflate")

local REGION_NAMES = { "us", "kr", "eu", "tw", "cn" } -- GetCurrentRegion() index order
local ROLE_LETTERS = { TANK = "T", HEALER = "H", DAMAGER = "D" }
local MAX_CHARACTERS = 30

--- Build the !PI1! export string for the player's current raid (or party).
--- Returns nil, reason when not in a group or LibDeflate is missing.
local function BuildRosterExport()
  if not LibDeflate then
    return nil, "LibDeflate not available"
  end
  local numMembers = GetNumGroupMembers()
  if numMembers == 0 then
    return nil, "not in a group"
  end

  local region = REGION_NAMES[GetCurrentRegion()] or "us"
  local myRealm = GetNormalizedRealmName() or ""
  local records = { region }
  local inRaid = IsInRaid()

  for i = 1, math.min(numMembers, MAX_CHARACTERS) do
    local unit = inRaid and ("raid" .. i) or (i == numMembers and "player" or ("party" .. i))
    local name, classFile, role
    if inRaid then
      local rosterName, _, _, _, _, rosterClassFile = GetRaidRosterInfo(i)
      name = rosterName
      classFile = rosterClassFile
      role = UnitGroupRolesAssigned(unit)
    else
      name = GetUnitName(unit, true)
      _, classFile = UnitClass(unit)
      role = UnitGroupRolesAssigned(unit)
    end
    if name and name ~= "" and name ~= UNKNOWNOBJECT then
      -- Same-realm members come back without a realm suffix.
      if not name:find("-", 1, true) then
        name = name .. "-" .. myRealm
      end
      records[#records + 1] = string.format(
        "%s:%s:%s",
        name,
        classFile or "",
        ROLE_LETTERS[role] or ""
      )
    end
  end

  if #records < 2 then
    return nil, "no exportable members"
  end

  local payload = table.concat(records, ";")
  local compressed = LibDeflate:CompressDeflate(payload)
  return "!PI1!" .. LibDeflate:EncodeForPrint(compressed)
end
```

3. **Slash command `/pi export`** - the website's copy tells users to type exactly this. Wire
   it into the addon's existing slash-command handling. On success, open a copy dialog; on
   failure, print the reason to chat (e.g. "PugInspect: you're not in a group").

4. **Copy dialog** - a small frame with a read-only, auto-highlighted `EditBox` containing
   the string (the WeakAuras-export pattern): `HighlightText()` on show and on click,
   close on Escape/Ctrl+C-then-Escape. Reuse the addon's existing frame styling if there is
   one. The string is a few hundred characters for a full raid - a one-line EditBox is fine.

## Format contract (must not drift)

```
!PI1!<EncodeForPrint(CompressDeflate(payload))>
payload = region;record;record;...
record  = Name-Realm:CLASSFILE:ROLE[:SPEC]
```

- `region`: lowercase `us|kr|eu|tw|cn` from `GetCurrentRegion()`.
- `Name-Realm`: realm is Blizzard-normalized ("TarrenMill") - the site re-slugs it; don't
  transform it in the addon.
- `CLASSFILE`: e.g. `DEATHKNIGHT`; empty string allowed. Display hint only.
- `ROLE`: `T`/`H`/`D`; empty when unassigned.
- `SPEC`: leave empty - deliberately unused (other raiders' specs would need inspect
  round-trips; the website's lookup fills specs in).
- Separators `;` and `:` never occur in character or realm names - no escaping.
- Max 30 members; truncate beyond that.
- `!PI1!` is version 1 of the format. Never change the payload shape without bumping the
  prefix (`!PI2!`) - the website matches the prefix exactly.

The website decoder is `apps/frontend/src/util/rosterImport.ts` in the web repo, and the full
contract doc is `docs/ROSTER_EXPORT_FORMAT.md` there.

## Verification

- **Round-trip is the test, not byte equality.** DEFLATE output differs between compressors,
  so two valid exports of the same roster can be different strings. Correct means: pasting
  the string at `https://puginspect.com/roster` detects the members with the right region,
  realms, class colors and role tags.
- Sanity-check the pipeline in-game before UI work:
  `/dump LibStub("LibDeflate"):EncodeForPrint(LibStub("LibDeflate"):CompressDeflate("eu;Test-Kazzak:MAGE:D"))`
  then paste `!PI1!<that output>` into the site - it should detect "Test" on kazzak as a mage.
- Test all three group states: solo (should refuse), 5-man party (player included via the
  party branch), raid. Cross-realm members must come out as `Name-TheirRealm`, same-realm as
  `Name-YourRealm` - never bare names.
