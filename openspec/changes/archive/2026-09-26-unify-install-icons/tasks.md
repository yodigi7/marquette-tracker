# Tasks

Test-first ordering: every test is written and observed failing before the code that makes it pass. Tasks 2.3 and 2.4 fail by unresolved import, because their subject does not exist yet — that is the expected failure, not a broken test.

Out of scope, per `design.md`: a 1024 px output, any change to `pnpm check`, any change under `src/`, and launch-screen colours.

## 1. Wire up the test harness

- [x] 1.1 [P] Widen the `include` in `vitest.config.ts` to also cover `scripts/**/*.{test,spec}.?(c|m)[jt]s?(x)` alongside the existing `src/**` entry, then verify `pnpm test` still collects every pre-existing `src` test by comparing the reported test count against the count before the change
- [x] 1.2 [P] Add an `icons` script to `package.json` that runs `scripts/generate-icons.mjs`, and verify `pnpm icons` is recognised and `pnpm check` is otherwise unchanged

## 2. Failing tests first

- [x] 2.1 Create `scripts/__tests__/icons.test.mjs` with a check that decodes every required install icon in `public/` (64, 192, 512, maskable 512, Apple touch 180) and asserts all `width x height` pixels are fully opaque, then run it and confirm it FAILS against the current bordered assets
- [x] 2.2 Add a check that every icon path referenced by `vite.config.ts` and `index.html` resolves to a file that exists and is one of the generator's declared outputs, then run it and confirm it FAILS because the committed lightning-bolt `favicon.svg` is not a generator output
- [x] 2.3 Add a check that the geometry's farthest mark pixel from the canvas centre is within `0.40 x canvas` (the maskable safe radius), then run it and confirm it FAILS with an unresolved import of `scripts/icons.mjs`
- [x] 2.4 Add a pixel-drift check (rebuild each icon in memory from the geometry, decode the committed file, compare pixels) and a determinism check (build twice in one run, compare bytes), then run them and confirm they FAIL with an unresolved import of `scripts/icons.mjs`

## 3. The generator library

- [x] 3.1 Create `scripts/icons.mjs` with the geometry from `design.md` D2 as named constants — canvas, background `#0c0a09`, bar width 52, gap 30, radius 26, heights 130/195/260, colours `#fafaf9`/`#84cc16`/`#a1a1aa`, safe-radius factor 0.40 — plus an exported output table naming each file and its sizes, and no filesystem side effects. The group box (148..364 by 126..386) and baseline (386) are **computed from those constants rather than restated**, so centring cannot drift away from the bars; the resulting values are asserted by the centring test
- [x] 3.2 [P] In `scripts/icons.mjs` implement the rounded-rectangle rasteriser with deterministic supersampled coverage on the caps, sample count derived from the output size and higher for sizes at or below 32, and verify the result by rendering one size to a scratch path outside the repository and measuring the group bounding box
- [x] 3.3 [P] In `scripts/icons.mjs` implement the PNG encoder per `design.md` D5 — 8-bit truecolour RGB, no alpha and no `tRNS`, only `IHDR`/`IDAT`/`IEND`, fixed zlib level — and verify the emitted bytes decode back to the exact pixel buffer that was encoded
- [x] 3.4 In `scripts/icons.mjs` implement the ICO builder wrapping 16, 32, and 48 px PNG frames in one container per `design.md` D9, and verify the container parses back to three frames of the expected dimensions
- [x] 3.5 [P] In `scripts/icons.mjs` implement the SVG builder emitting the full-bleed mark per `design.md` D6, and verify the emitted markup contains a full-canvas background rect and three bars matching the geometry constants
- [x] 3.6 Run `pnpm test` and confirm 2.3 and 2.4 now execute rather than failing to resolve, with 2.3 passing and 2.4 failing only on the stale committed assets

## 4. Emit the assets

- [x] 4.1 Create `scripts/generate-icons.mjs` as a thin entry point that imports `scripts/icons.mjs` and writes every entry in the output table, and verify `pnpm icons` writes exactly the declared files and nothing else
- [x] 4.2 Run `pnpm icons` and verify all five install PNGs are now fully opaque edge to edge with no border or transparent margin, decoding each file rather than trusting the run
- [x] 4.3 Delete `public/favicon.svg` and verify no source file, config file, or built artefact still references it
- [x] 4.4 Run `pnpm test` and confirm the opacity, safe-area, reference-integrity, pixel-drift, and determinism checks all pass against the freshly written assets

## 5. Declaration surface

- [x] 5.1 In `index.html` replace the icon links with `%BASE_URL%`-prefixed references in the order scalable icon, favicon fallback, Apple touch icon, adding the Apple touch icon declaration that is currently missing
- [x] 5.2 [P] Correct the icon generation instruction in `docs/MILESTONE_1_SCAFFOLD.md` so it points at `pnpm icons` instead of the one-off command that produced the bordered assets, and verify the corrected instruction names the committed generator
- [x] 5.3 Confirm `vite.config.ts` still declares the required manifest icon set — 192, 512, 512 maskable, and 180 Apple touch — with correct sizes, types, and purposes, changing nothing if it already matches
- [x] 5.4 Run `pnpm icons` once more and verify the working tree shows no change to any icon, confirming the committed assets are exactly what the generator produces

## 6. Gates

- [x] 6.1 Run `pnpm check` and confirm formatting, lint, tests, and build are all green with the new files included in the formatting and lint passes
- [x] 6.2 Inspect the built service worker precache list and confirm every generated icon is precached, so an offline-installed app does not fall back to a stale icon
- [x] 6.3 Inspect the built `index.html` and `manifest.webmanifest` and confirm every icon reference resolves under the `/marquette-tracker/` base path rather than to the host root

## 7. Verify on device

Accepted without device verification at the owner's direction. The icon properties
these cover were verified against the committed files and against simulated
platform masks instead. Unconfirmed on hardware: the iOS Home Screen result, the
Android/desktop mask result, and tab legibility at 16 px and 32 px.

- [x] 7.1 Install the built application on a real iOS device after removing any previously installed copy, and confirm the Home Screen icon shows no white halo or inner edge
- [x] 7.2 [P] Install on an Android or Chromium device and on one desktop environment, confirming the icon shows no halo and the three bars survive the platform mask uncut
- [x] 7.3 Confirm the browser tab at 16 px and 32 px shows the three bars against both light and dark browser chrome, and record the result even if the 16 px rendering is accepted as mediocre
