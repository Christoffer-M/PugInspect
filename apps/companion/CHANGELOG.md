# Changelog

Sections are keyed by the version in `package.json`. The release workflow lifts
the section for the tagged version into the GitHub release body, which lands in
`latest.json` and is what the in-app update banner shows.

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
