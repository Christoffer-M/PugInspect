# Changelog

Sections are keyed by the version in `package.json`. The release workflow lifts
the section for the tagged version into the GitHub release body, which lands in
`latest.json` and is what the in-app update banner shows.

## 0.3.0

- Applicants now come through on machines where display colour management shifted the
  captured colours enough to make the strip unreadable.
- The strip is compressed and carries far less data, so it stays a single 4px row even with a
  full applicant list, where it used to be three. Item level, class and score now come from
  puginspect.com rather than the strip, so they appear a moment after the applicant does.
- **Requires the PugInspect addon v1.3.0 or newer**; the app says so if the addon is older.

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
