# Changelog

Sections are keyed by the version in `package.json`. The release workflow lifts
the section for the tagged version into the GitHub release body, which lands in
`latest.json` and is what the in-app update banner shows.

## 0.9.0

- A bell button in the titlebar mutes notifications in one click. The status bar says
  "notifications muted" while it is on, so the app is never silently quiet.
- Settings has a "Check now" button under Updates, so you can pull in a new release
  without waiting or restarting the app.
- The titlebar is a little taller and easier to hit.

## 0.8.1

- Opening a character in the app no longer freezes the companion on Windows. The window
  used to stay blank white and the whole app stopped responding.

## 0.8.0

- The "rio" column is now "m+". Ratings come straight from Blizzard — the same number
  Raider.IO shows, still in Raider.IO's colours — so they and raid progress load noticeably
  faster.
- Required by PugInspect's updated servers: older versions no longer show ratings or raid
  progress.

## 0.7.1

- Character pages opened from the app now carry a marker saying the link came from the
  companion, so PugInspect's anonymous visit counts can tell companion clicks apart from
  ordinary web visits. It identifies the app, not you.

## 0.7.0

- Character pages can now open in the app instead of your browser, in one window that every
  later applicant reuses rather than a new tab each time. Off by default -- turn on "Open
  characters in the app, not the browser" under Settings if the tabs pile up on you.

## 0.6.4

- Applicants from Russian realms now load like everyone else. Their score, parses and item
  level never arrived before, leaving the row stuck loading.
- A long applicant list with Russian names no longer reports the addon as out of date. The
  list was being cut short in a way the app could not read, so it blamed the addon instead
  of showing the applicants it did get.

## 0.6.3

- Realm names under each applicant now come from Blizzard once their details load, so
  realms like "Der Rat von Dalaran" read correctly instead of as a guessed spelling. Until
  then the name shows as the game sends it.
- A smaller download: the app no longer ships its own copy of every realm name.

## 0.6.2

- Corrects what the app reports in its anonymous usage statistics: waiting for the addon's
  strip is no longer counted as a sync that broke mid-session, so the two are told apart.
  Nothing you see in the app changes, and nothing new is reported -- "Send anonymous usage
  statistics" under Settings still turns all of it off.

## 0.6.1

- Applicant details now appear as soon as each source answers, instead of every column
  waiting on the slowest one. A slow Raider.IO no longer holds up the item level, class or
  parse columns, and each fills in on its own.

## 0.6.0

- Anonymous usage statistics now go to PugInspect's own servers instead of a third-party
  analytics service, and include a randomly generated installation id so that repeat reports
  from one installation count as one rather than many. Nothing about your characters, your
  group or its applicants is reported. "Send anonymous usage statistics" under Settings still
  turns all of it off, and the privacy policy on puginspect.com lists exactly what is sent.

## 0.5.1

- Parses now match the role an applicant signed up as. A healer sitting in a damage spec --
  a Devastation-specced Evoker applying as a healer, say -- was showing damage parses; the
  role from the Group Finder now decides which numbers are looked up.

## 0.5.0

- Applicants now show the game's own role icons for tank, healer and damage.
- Launching the app while it is already running brings the existing window to the front instead
  of opening a second one.

## 0.4.0

- The strip takes up much less of the screen: a full applicant list is two 4px rows instead of
  three, and a typical one is a short line. The applicant block is compressed now, and score is
  looked up rather than carried.
- Item level and class come straight from the game, so they are right the moment an applicant
  appears -- and item level stays right after a gear swap, where the looked-up value lags.
- **Requires the PugInspect addon v1.3.0 or newer**; the app says so if the addon is older.

## 0.3.0

- Applicants now come through on machines where display colour management shifted the
  captured colours enough to make the strip unreadable. **Requires the PugInspect addon
  v1.2.0 or newer**; the app says so if the addon is older.

## 0.2.3

- Fixed applicants never appearing when the game runs in plain Windowed mode.
- Settings → Troubleshooting can now save a capture of the strip area for support.

## 0.2.2

- The update banner now shows what changed in the new version.
- Anonymous usage reporting now goes to the shared Umami instance (still off by default).

## 0.2.1

- Fixed the empty-state bottom margin.

## 0.2.0

- Optional anonymous usage analytics, off by default (Settings → Privacy).

## 0.1.0

- First release: live group finder applicants, desktop notifications, auto-update.
