# Proposal

## Why

The installed app icon shows an uneven white halo on iPhone, and the same defect is latent on every other platform. The cause is that each icon file already carries its own rounded shape plus a border or transparent margin, and the operating system then applies its own mask on top. Two different roundings that do not line up let the surround show through as a ragged white crescent — thickest at the corners, thinnest at the edges.

Three things make this worse than a one-off cosmetic bug. The five committed PNGs disagree with each other: the bars are a measurably different size and sit at a different height in the standard icons than in the Apple and maskable icons, and the `icon.svg` that appears to be their source matches none of them. The app therefore ships three different logos. The browser tab shows an unrelated purple lightning bolt left over from the project scaffold. And nothing in the repository can regenerate the icons — they are hand-committed binaries whose only recorded provenance is a stale command in a milestone document — so the defect returns silently the next time anyone regenerates them.

## What Changes

- Replace the icon artwork so every install icon is a single full-bleed, fully opaque near-black canvas with the three-bar mark centred on it, with no shape or border baked into the image. The operating system applies the outline, which is the only layer that should.
- Adopt one bar geometry, sized to sit inside the maskable safe zone with margin, and use it for every icon so the mark appears at the same size on every surface.
- Centre the mark on the canvas. Today it sits above centre in every variant.
- Replace the scaffold browser tab icon with the same three-bar mark, and name the icon explicitly for iOS so the Home Screen icon is chosen deterministically instead of at the browser's discretion.
- Regenerate the favicon at the sizes browsers actually request (16, 32, 48) instead of the current single 48px entry.
- Commit a dependency-free generator that owns the geometry and emits every icon file, making the artwork a readable, diffable source rather than opaque binaries. Re-running it produces byte-identical output.
- Add tests that fail when a committed icon drifts from the generator, when any pixel of a required icon is not fully opaque, or when the mark leaves the maskable safe zone — so this specific defect cannot return unnoticed.
- No new dependency.

## Capabilities

### New Capabilities

- `install-icons`: the application's install and browser-tab icon artwork — what every icon surface must look like, that all of them derive from one committed source, and that they are verified rather than assumed.

### Modified Capabilities

- None.

## Impact

Five PNG install icons in `public/` (64, 192, 512, maskable 512, Apple touch 180) plus the favicon `.ico` are regenerated. The SVG icon is regenerated, and the scaffold lightning-bolt `favicon.svg` is removed.

`index.html` gains an explicit Apple touch icon link and points its icon links at the regenerated files. Every icon link must keep resolving under the repository's `/marquette-tracker/` base path in the production build, which is verified against the built output rather than assumed.

A new generator under `scripts/` becomes the only supported way to change the artwork, wired to a `package.json` script. `vitest.config.ts` widens its test include to cover `scripts/`, so the new drift tests run inside the existing `pnpm check` — no change to the quality-gate command itself and none to its specification.

One stale instruction in `docs/MILESTONE_1_SCAFFOLD.md` that reproduces the defect is corrected so it cannot be followed again.

No new dependency, no application code change, no change to stored user data, and nothing about the cycle algorithm or the views the user works in.
