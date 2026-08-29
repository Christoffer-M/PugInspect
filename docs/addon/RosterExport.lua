-- RosterExport.lua - reference implementation of the PugInspect roster export.
-- Drop into the PugInspect addon (requires LibDeflate, e.g. via LibStub).
-- Format contract: docs/ROSTER_EXPORT_FORMAT.md in the PugInspect web repo.

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

-- Expose for the addon's slash command / export UI (copyable edit box).
PugInspectRosterExport = BuildRosterExport
