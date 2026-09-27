# Design

## Context

See `proposal.md` for why. What shapes the approach:

- **The icons are opaque-capable, not opaque-required.** A maskable icon is by definition full-bleed, so the current 15% white border on `maskable-icon-512x512.png` is wrong by definition, not merely by taste.
- **The mark is four shapes.** Three stadium-shaped bars (ascending heights, common baseline) on a flat background. There is no gradient, no texture, and no path outline to trace.
- **The current PNGs are palette-quantised** (8–19 colours, with a stray `#4c6971` transparent entry) and total ~2 KB each. There is no size pressure that would justify quantising a 512 px icon.
- **The mark does not match any committed file.** Measured bar spans are 26.6–73.4% across in the standard icons, 32.8–66.7% in the Apple and maskable icons, and 25.8–74.2% in `icon.svg`. All three also sit above centre, by 4.5–9.4% of canvas height. There is no existing source of truth to preserve, so the geometry is free to be defined once, correctly.
- **The icons are precached by the service worker**, so changing them changes the precache revision. `registerType: "autoUpdate"` with `skipWaiting` will activate the new revision, but the platform's own icon cache is outside our control.
- **Tooling boundary.** `tsconfig.app.json` covers `src` only and carries no Node types; `tsconfig.node.json` covers `vite.config.ts` only. Verified: `oxfmt` and `oxlint` both process `.mjs`, and Vitest's default include (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) already matches `.mjs` test files.

## Goals / Non-Goals

**Goals:**

- One mark definition, expressed once, producing every shipped icon at every size and format.
- Every install icon fully opaque with a uniform background, so no platform mask can expose a surround.
- The mark centred, and inside the maskable safe area with margin.
- Regeneration reproducible from a clean checkout with no new dependency.
- The defect detectable automatically, inside the existing quality gate, by reading the committed files rather than the generator's intent.

**Non-Goals:**

- Redesigning the three-bar mark. Bar count, ascending order, common baseline, and the three colours are carried over unchanged.
- Launch-screen colours. `background_color` stays `#fafaf9`.
- A second, simplified mark for small sizes. One mark everywhere, accepting that at 16 px the lightest bar dims toward grey.
- Any change to `pnpm check` or to the quality-gate specification.
- Anything under `src/`. This change touches no application code.

## Decisions

### D1 — Full-bleed opaque canvas; no shape baked into any install icon

The platform mask is the only layer that draws an outline. A pre-rounded tile inside a masked canvas is the defect itself, so no output may contain a border, a transparent margin, or an inner edge.

_Alternative considered:_ keep a rounded dark tile but fill the surrounding area with the same dark colour, so the inner edge is invisible. Rejected — visually identical to a plain square, but it keeps geometry that can drift and re-create the halo.

### D2 — One geometry, defined once, in a 512-unit design space

The first block is the authored source. The second is **derived from it at
runtime** rather than restated, so the centring cannot drift away from the bars.

```
canvas          512 x 512
background      #0c0a09, full bleed
bar width       52
bar gap         30            (pitch 82)
bar radius      26            (= width / 2, stadium ends)
bar heights     130, 195, 260 (ascending, common baseline)
bar colours     #fafaf9, #84cc16, #a1a1aa   (short, mid, tall)
safe factor     0.40          (maskable safe radius, see D3)

--- derived at runtime, not authored ---
group x         148 .. 364     (= (512 - 216) / 2)
group y         126 .. 386     (= (512 - 260) / 2)
baseline        386
group centre    (256, 256) = canvas centre
```

Derived: group spans 216 × 260, i.e. 42.2% × 50.8% of the canvas. The farthest mark pixel from centre is at most 169.0 px (the group bounding-box corner at 364,126; the real corner is rounded, so this is an upper bound).

Every size is a scale of this one definition, so the mark is provably identical in proportion everywhere — subject to the rasterisation tolerance recorded under Risks. Centring the _bounding box_ is the choice made here; it is not the same as optically centring, because the ascending bars put more visual mass on the right. The offset is small and the bounding-box rule is checkable, so it is preferred over a hand-tuned nudge that no test could verify.

`scripts/icons.mjs` computes the derived block from the authored one, so a
reader looking for a literal `148` or `386` in the source will not find one. That
is intentional: the values are produced by `MARK` and asserted by the centring
test, and restating them as constants would let the two drift apart.

### D3 — Safe area is the inner 80% circle; the mark uses 82.5% of its radius

0.40 × 512 = 204.8 px safe radius, against a mark maximum of 169.0 px — a margin of 35.8 px. A launcher applying the most aggressive common mask, a circle inscribed in the safe area, keeps all three bars whole.

_Alternative considered and rejected:_ the native Android adaptive-icon figure of a 66/108 safe zone (radius 30.6% of canvas = 156.4 px) would clip this mark. That figure governs native application icons in an installed package; a web PWA passes through the browser's web-icon pipeline, whose documented maskable safe area is the 80% circle. Recorded as a risk below rather than adopted as the constraint, because adopting it would shrink the mark by roughly a further 8% to satisfy a mask this delivery path does not use.

### D4 — Dependency-free generator, plain ESM, under `scripts/`

The whole artwork is four rounded rectangles on a flat background, so a rasteriser is a few dozen lines and PNG encoding is a header, a zlib stream, and a CRC. That removes any need for a rendering dependency.

_Alternatives considered:_ `sharp` — a new dependency, against the project's stated discipline, for a problem that does not need one. `@vite-pwa/assets-generator` — its `minimal-2023` preset is what produced the current bordered output. Hand-editing binaries — the status quo, and the reason this defect can return unnoticed.

Plain `.mjs` rather than TypeScript, because this is build tooling and not application code. Keeping it out of `src/` preserves the app/tooling boundary and avoids pulling `node:zlib` and `node:fs` into an app TypeScript project that has no Node types. Verified that `oxfmt` and `oxlint` already cover `.mjs`, and that Vitest's default include already matches `.mjs` test files — so no toolchain configuration is needed for this, only a widened include (D7).

Layout:

```
scripts/icons.mjs              pure library: geometry, rasteriser, PNG/ICO/SVG builders
scripts/generate-icons.mjs     CLI entry point: writes every file, nothing else
scripts/__tests__/icons.test.mjs   the checks in D7
```

The library has no filesystem side effects, so it can be imported by both the CLI and the tests, and the tests can build every icon in memory.

### D5 — Deterministic, alpha-free PNG encoding

8-bit truecolour RGB, no alpha channel and no `tRNS` chunk. Because the artwork is fully opaque by D1, an alpha channel would be dead weight — and its absence makes the "fully opaque" property structurally impossible to violate rather than merely asserted.

Only `IHDR`, `IDAT`, `IEND` are written: no `tIME`, no `gAMA`, no text chunks. A fixed zlib level and a fixed supersample count per output size. These are what make a regenerated file comparable to the committed one.

Anti-aliasing is supersampled coverage on the rounded caps, with the sample count chosen deterministically from the output size and higher for the small sizes where the caps are only a few pixels wide.

_Alternative considered:_ an analytic distance-to-rounded-rect coverage function. Marginally prettier at 16 px, but the supersampled form is simpler to read and is what a reviewer needs to be able to trust.

### D6 — The scalable icon carries the dark background too

A transparent-background SVG is the conventional choice for a browser tab and looks lighter against light chrome. It is wrong for this mark: the lightest bar is `#fafaf9`, which vanishes against a light tab bar. The dark background is precisely what keeps all three bars legible on both light and dark chrome, so the SVG is full-bleed like every other output.

### D7 — The checks live in `scripts/`, reached by widening one Vitest include

`vitest.config.ts` currently includes `src/**` only. Widening it to also cover `scripts/**` puts the icon checks inside `pnpm test`, which is already inside `pnpm check`, CI, and `pre-push`.

_Alternative considered:_ putting the tests under `src/` — rejected, because the code under test is build tooling and `src/` is the application. _Alternative considered:_ adding an `icons:check` command to `pnpm check` — rejected, because it would change the canonical quality command and require a `quality-gates` delta for no gain over reaching the same tests through `pnpm test`.

Three checks:

1. **Pixel drift.** Rebuild each icon in memory from the geometry, decode the committed file, and compare pixels. Comparing decoded pixels rather than compressed bytes is deliberate: the question is whether the committed image shows what the source describes, and pixel comparison does not couple the test to a particular zlib version.
2. **Determinism.** Generate twice in one run and compare bytes, so nondeterminism is caught without depending on cross-version byte stability.
3. **Invariants on the committed files.** Every pixel of every required install icon is fully opaque, and the geometry's maximum radius from centre is within the safe area. These read the committed artefacts, so they catch a hand-edited or truncated file that a generator-intent check would miss.

A fourth check asserts that every icon path referenced by the Vite config and by `index.html` exists on disk and is one of the generator's outputs, so a stale reference cannot outlive the file it points at.

### D8 — Icon links in `index.html` use `%BASE_URL%`

`%BASE_URL%` is Vite's documented mechanism for exactly this and is replaced at build time. The current `/favicon.svg` works only through Vite's implicit `link[href]` rewrite, which is observable in the built output today but is not an explicit intent. Every icon link moves to `%BASE_URL%` so the deployment subpath requirement is satisfied deliberately. Declared order is the scalable icon first, the `.ico` as fallback, then the Apple touch icon.

Declaring the Apple touch icon is the substantive fix for the reported symptom: without it, the Home Screen icon is whichever asset the browser decides to use, which is why the halo appeared at all.

### D9 — `favicon.ico` becomes a real multi-entry icon

16, 32, and 48 px PNG-compressed frames in one container. The committed file is a single 48 px entry, so browsers requesting 16 or 32 px downscale a larger image. PNG-in-ICO is what the current file already uses and is supported everywhere that matters.

### D10 — `favicon.svg` is deleted; `icon.svg` is generated

The scaffold lightning bolt is removed rather than corrected, because it is not a variant of this mark and nothing should preserve it. `icon.svg` is emitted from the same geometry as the PNGs, so the scalable and raster artwork cannot drift apart. That also gives the stale `icon.svg` — which matched no committed PNG — a correct replacement rather than leaving a fourth logo in the folder.

### D11 — `pwa-64x64.png` is kept and regenerated

It is already declared in the manifest and is below the size any launcher uses for an installed icon, so it is effectively inert. Regenerating it full-bleed makes it consistent; removing it is unrelated churn. _Alternative considered:_ drop it as cleanup — rejected as out of scope.

## Risks / Trade-offs

- **[A committed icon may fail to regenerate byte-identically across Node major versions, because zlib output is not guaranteed stable across versions]** → Pixel comparison is the drift check, so a zlib difference cannot fail the build; a separate same-run determinism check catches genuine nondeterminism. Cross-version byte differences would show up as a noisy `git status` after a manual regeneration, and re-committing resolves it with no behavioural change.
- **[A sufficiently aggressive launcher mask could still clip the mark]** → The bar scale is a single constant in `scripts/icons.mjs`; shrinking the mark is a one-line change plus a re-run, and the safe-area check enforces whatever value is chosen. Verification on a real device is the only way to know, which is why the verification procedure is a task rather than an assumption.
- **[iOS caches Home Screen icons aggressively, so the fix may not be visible after deploying]** → The verification procedure requires removing the previously installed app, or clearing the site's data where the platform allows it, before reinstalling. This is a limit of verification, not of the change.
- **[The 16 px mark is knowingly mediocre — the lightest bar dims toward grey]** → Accepted deliberately, in preference to maintaining a second logo. Revisit only if the tab looks bad in real use.
- **[The mark's measured footprint necessarily diverges from its design proportion at the smallest sizes, and this is not a defect to fix]** → At 16 px the design calls for a 1.625 px bar and a 0.94 px gap, which cannot be represented; that frame measures roughly 50% × 62.5% of the canvas against the design's 42.2% × 50.8%, converging as size grows (42.7% at 192 px, 42.2% at 512 px). Every raster icon set has this floor. Do not "correct" it by nudging the geometry, and do not read the 16 px measurement as the generator disagreeing with D2 — one authored definition still drives every output. Any cross-icon proportion check must allow a one-pixel quantisation tolerance.
- **[Widening the Vitest include means `pnpm test` now also collects from `scripts/`]** → The pattern is scoped to `scripts/**` rather than replacing the `src/**` entry, so nothing about existing test collection changes.
- **The service worker precaches the icons, so a redeploy changes the precache revision** → Expected and desired; `autoUpdate` plus `skipWaiting` activates it. The platform icon cache is out of reach, as above.

## Migration Plan

No data migration and no user-visible state change. The change swaps binaries in `public/` and adds tooling.

Deploy by merging; the build precaches the new icons and the service worker activates them. Rollback is reverting the commit, which restores the previous binaries with it.

Verification after deploy: build, confirm the built manifest declares the required sizes and purposes and that every icon reference resolves under the deployment subpath, then install on a real device after removing any previously installed copy.

## Open Questions

- Whether a 1024 px icon is worth emitting for future tablet and desktop surfaces. Deferrable: adding it is one more entry in the generator's output table and touches no spec.
