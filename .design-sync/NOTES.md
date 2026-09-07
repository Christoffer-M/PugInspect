# design-sync notes — @repo/ui

## Repo shape
- The design system is `packages/ui` (`@repo/ui`). It has **no build step** (`main: src/index.ts`),
  so the converter runs in synth-entry mode off `src/`. Don't go looking for a `dist/`.
- Run the converter with `--node-modules apps/frontend/node_modules`, **not** the repo root and not
  `packages/ui/node_modules`: only the frontend's tree has `react`, `react-dom`, `@mantine/core`
  *and* the `@repo/ui` workspace symlink together. `packages/ui/node_modules` has no `react-dom`.
- Because of that, `PKG_DIR` is `apps/frontend/node_modules/@repo/ui`. Any `cfg` path resolved
  relative to the package (`extraFonts`) must stay **inside** `packages/ui` or the depth is wrong —
  that's why the fonts live at `packages/ui/.ds-fonts/`, not under `.design-sync/`. A wrong path is
  logged as `! extraFonts: … not found — skipped` and silently produces fallback-font previews.

## CSS
- `cfg.cssEntry` points at `packages/ui/.ds-css-entry.css`, a **generated, gitignored** file.
  Regenerate it with `cfg.buildCmd` before every converter run:
  `cat apps/frontend/node_modules/@mantine/core/styles.layer.css packages/ui/src/globals.css | sed 's/^html,$//' > packages/ui/.ds-css-entry.css`
- It uses Mantine's **`styles.layer.css`**, not `styles.css`. cssEntry is *appended* after the
  CSS-module rules in `_ds_bundle.css`, so the unlayered module styles must win — `@layer mantine`
  guarantees that regardless of order. Swapping in plain `styles.css` silently inverts the cascade.
- The `sed` drops the `html,` selector from `globals.css`. Deliberate: the preview harness hardcodes
  `body{background:#fff}`, so an `html` rule paints the rest of the viewport dark and every card
  renders as a white strip over a huge dark void. Designs still get `body{background:#060b16}`.

## Fonts
- Inter / Space Grotesk / JetBrains Mono are fetched from Google Fonts by the app via `<link>`,
  so nothing shippable existed in-repo. They were downloaded once (OFL, redistributable) to
  `packages/ui/.ds-fonts/` as **variable** woff2 — one file per family, one `@font-face` with a
  weight range. Google returns an identical variable file per requested weight; don't re-add the
  per-weight duplicates.

## Previews
- Dark-only DS on white cards: every story wraps in `.design-sync/previews/_surface.tsx`, which
  paints the app's `#060b16` page ground. `_surface` is a helper, not a component — the build logs
  `(stale preview: _surface — component no longer exported)` every run. Expected, ignore it.
- `ExternalLinkIcon`'s `icon` prop is typed `React.ReactNode` but is really an image **URL**
  (`<Image src={icon}>`). Previews inline data URIs so cards render offline. If you hand-write an
  SVG data URI, let `encodeURIComponent` handle the `#` in colours — pre-encoding to `%23` double-
  encodes and the icon renders invisible with no error.
- `SkeletonTableRows` is set to `cardMode: "column"` (a 6-column table overflows a grid cell).

## Known render warns
- `[TOKENS_MISSING]` — 12 `--app-shell-*` custom properties. Mantine's `AppShell` sets these at
  runtime from props; nothing defines them statically and no shipped component uses `AppShell`.
  Renders verify clean. Not actionable.
- `(stale preview: _surface …)` — see Previews above.

## Re-sync risks
- `.ds-css-entry.css` is generated and gitignored: a fresh clone that skips `cfg.buildCmd` builds a
  bundle with **no Mantine CSS at all** and still exits 0 on validate (renders aren't blank, just
  unstyled). Always run `buildCmd` first, and eyeball a contact sheet.
- The Mantine version is whatever `apps/frontend/node_modules` resolves. A major Mantine bump
  changes the shipped CSS wholesale and can invalidate the class/token claims in `conventions.md` —
  re-run the conventions validation pass after any Mantine upgrade.
- `conventions.md` names `theme` colour keys (`accent`, `dark`) read from `packages/ui/src/theme.ts`.
  If the theme's palette is renamed, that file goes stale and the design agent will emit colour
  names that don't resolve.
- Fonts were fetched from Google Fonts at sync time and are pinned in-repo; they won't track
  upstream font updates. That's intentional.
- Only `packages/ui` is synced. The ~24 components under `apps/frontend/src/components/` are
  data-coupled app components and were deliberately left out.
