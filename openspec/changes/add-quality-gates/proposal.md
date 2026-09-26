# Proposal

## Why

Nothing in this repository validates a change before it leaves the machine. `pnpm lint`, `pnpm test`, and
`pnpm build` all pass, but they run only inside `.github/workflows/deploy.yml` after a push to `main`, so
formatting, lint, type, and test failures can survive an entire branch's worth of work and surface only at
merge time. There is also no formatter at all, and the absence has already produced measurable drift: across
the 97 TypeScript/TSX sources, 43 files are single-quote dominant, 16 are double-quote dominant, and 38 mix
both. The repository has no style to converge on, so style is currently decided by whichever file was edited
last.

## What Changes

- Add **oxfmt** as the single formatter, with a committed `.oxfmtrc.json` that keeps oxfmt defaults and adds
  three targeted exceptions (see design).
- Apply a **one-time repository-wide reformat** (120 tracked files) as its own commit, containing no
  behavioral changes, so the tooling diff stays reviewable on its own.
- Add package scripts for the individual gates (`format`, `format:check`, `typecheck`) and one canonical
  aggregate, `check`, that local hooks and CI both invoke.
- Add **versioned Git hooks** under `.githooks/` (`pre-commit`, `pre-push`), auto-enabled on install via a
  `prepare` script that sets `core.hooksPath` — no hook-manager dependency.
- Add `.github/workflows/ci.yml` running `pnpm check` on pull requests and pushes to `main`, with read-only
  permissions and no deployment step.
- Update `deploy.yml` to invoke the same canonical `pnpm check` instead of separate test/lint/build steps,
  keeping deployment triggers and permissions unchanged.
- Add a **narrow `oxlint` override** that silences the three existing `react/only-export-components`
  warnings in `src/components/ui/`, bringing the lint baseline to zero warnings without enabling
  warning-as-error.
- Document hook setup, bypass, and recovery in `README.md` and `AGENTS.md`.

## Capabilities

### New Capabilities

- `quality-gates`: How the project enforces formatting, linting, type checking, testing, and building —
  the formatter configuration and its scope, the canonical command surface, the local Git hook behavior,
  the pull-request validation workflow, and the cleared lint baseline.

### Modified Capabilities

None. `github-pages-deployment` already requires the deployment workflow to run the install, test, lint, and
build gates before publishing; that requirement remains satisfied, now through the canonical `check` script.
Its externally observable behavior — publish on `main` push, manual trigger, no publish from other branches —
does not change, so it needs no delta.

## Impact

**New dependency (exactly one):** `oxfmt` as a devDependency. It joins the existing `oxlint` in the same
Oxc toolchain and reads the same Prettier-style option shape. Explicitly **not** added: Prettier, Biome,
dprint, Husky, Lefthook, lint-staged, simple-git-hooks, and any Python tooling (Ruff/mypy/pytest).

**Files added:** `.oxfmtrc.json`, `.githooks/pre-commit`, `.githooks/pre-push`, `.github/workflows/ci.yml`.

**Files modified:** `package.json` (scripts + one devDependency), `.oxlintrc.json` (one override),
`.github/workflows/deploy.yml` (collapse three steps into `pnpm check`), `README.md`, `AGENTS.md`, and 120
tracked source/config/doc files touched by the reformat commit only.

**Not affected:** application runtime behavior, the `src/core/engine` Marquette algorithm and its tests, the
Dexie schema, and every deployed capability. The lint override and formatter config do not alter emitted
JavaScript, CSS semantics, or type behavior.

**Assumption recorded for review:** `openspec/changes/archive/**` is excluded from formatting alongside
`.opencode/**`. Archived changes are immutable records of what was specified and validated at a past point in
time, the directory grows by one change per completed cycle, and reformatting it rewrites history without
improving anything. Live `openspec/specs/**` files _are_ formatted, since the project authors and edits them.
This is a single line in `ignorePatterns` and is trivially reversible if that judgment is wrong.
