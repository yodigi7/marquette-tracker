# Design

## Context

See `proposal.md` — Why for motivation. The current state that shapes this approach:

**Existing quality surface.** `package.json` has `lint` (oxlint 1.77), `test` (vitest run), and
`build` (`tsc -b && vite build`). `build` is the only place a type check happens, so type checking is not
independently runnable. There is no `format` script, no formatter, no formatter config, no Git hook, and no
hook manager. `.oxlintrc.json` enables `react/rules-of-hooks` as an error and
`react/only-export-components` as a warn with `allowConstantExport: true`.

**Why that warning option does not help.** `allowConstantExport` exempts constant exports, but shadcn's
variant objects are the result of a `cva(...)` call, which is a function rather than a literal. All three
current warnings are this: `badge.tsx`, `tabs.tsx`, and `button.tsx`, each exporting a `cva` result alongside
its component.

**The only existing automation.** `.github/workflows/deploy.yml` runs on push to `main` and
`workflow_dispatch`, with `pages: write` and `id-token: write`. It runs `pnpm test`, `pnpm lint`, and
`pnpm build` as three separate steps before uploading the artifact. It is the sole quality gate, and it only
exists on `main`.

**Style has already drifted, and semicolons are effectively absent.** Across the 97 TypeScript/TSX sources,
43 are single-quote dominant, 16 are double-quote dominant, and 38 mix both. Separately, only one file in
`src` contains any semicolon-terminated line, and the shadcn-provided files in `src/components/ui/` are
semicolon-free.

**Measurements taken against this repository.** These drove the decisions below.

| Operation                 | Cost                       |
| ------------------------- | -------------------------- |
| `oxlint` (full, 99 files) | 0.7 s                      |
| `openspec validate --all` | 0.6 s (green, 11/11 specs) |
| formatter on staged files | ~0.1 s                     |
| `tsc -b` (forced)         | 4.0 s                      |
| `tsc -b` (incremental)    | 4.0 s                      |
| `vitest run`              | 12.9 s                     |
| `vite build`              | 2.7 s                      |

Reformat cost, measured as tracked files changed and total changed lines, with `.opencode/**` and
`openspec/changes/archive/**` excluded throughout:

| Style configuration                                     | Files | Changed lines |
| ------------------------------------------------------- | ----- | ------------- |
| **`semi: true`, `printWidth: 100` (defaults) — chosen** | 121   | ~14,547       |
| `semi: false`, `printWidth: 100`                        | 119   | ~7,843        |
| `semi: true`, `printWidth: 80`                          | 120   | ~16,223       |
| `semi: false`, `printWidth: 80`                         | 119   | ~9,792        |

Note the file _count_ barely moves between rows (119–121) while the line count nearly halves. The semicolon
decision changes the volume of the reformat, not its breadth.

## Goals / Non-Goals

**Goals:**

- One command that runs every gate, invoked unchanged by local hooks and by CI.
- A pre-commit gate fast enough that it is never worth bypassing for speed.
- A committed style that a contributor can satisfy by running one command.
- A clean lint baseline, so that tightening lint later is a config change rather than a cleanup project.
- No new dependency beyond the formatter itself.

**Non-Goals:**

- Warning-as-error. The baseline becomes clean here, but turning warnings into errors is a separate policy
  decision and stays off.
- Fixing the Vite chunk-size warning.
- Speculative secret scanning, Python tooling, commit-message linting, or lint-staged's partial-staging
  safety machinery.
- Reformatting as a side effect of unrelated work. The reformat is one isolated commit.

## Decisions

### 1. oxfmt as the single formatter

Chosen because the project already depends on `oxlint`, so this adds a second tool from one toolchain with
one option dialect, and it is roughly twice as fast on this tree (2.5 s vs 5.7 s for a full write), which
matters because the pre-commit hook calls it.

The pre-1.0 version is the main argument against, so it was tested directly rather than assumed. Formatting
the whole repository with oxfmt and independently with Prettier 3.9.9, under identical options, produced the
**same set of 166 changed files**, and the resulting trees differed in only three files — `package.json`
(oxfmt's `sortPackageJson` default reorders keys), `pnpm-lock.yaml`, and `src/core/engine/types.ts` (oxfmt
always breaks a union type onto one line per member; Prettier keeps it inline when it fits). After setting
`sortPackageJson: false`, a whitespace-stripped comparison of the final tree showed **zero** differing lines
across all of `src/`. So oxfmt is currently byte-equivalent to Prettier here, and a future Prettier
migration would be a config swap rather than a second reformat.

Alternatives considered: **Prettier** — stable and ubiquitous with better editor "format on save" support,
but a second toolchain and slower. **Biome** — combines lint and format well, but would replace `oxlint`,
which is out of scope. **dprint** — a plugin model that would need a TypeScript plugin declared and
maintained. Rejected on dependency count and config surface.

### 2. Style: oxfmt defaults, with three targeted exceptions

Defaults mean `semi: true`, `singleQuote: false`, `printWidth: 100`, `trailingComma: "all"`, `tabWidth: 2`.
Chosen deliberately over `semi: false`, which would have matched the existing near-universal style, halved
the reformat to ~7.8k lines, and kept shadcn's own output stable. The cost of the choice is recorded under
Risks. `printWidth: 100` is strictly better than 80 here even with semicolons on (14.5k vs 16.2k lines).

Three exceptions, each earning its place by measurement rather than taste:

- **`sortPackageJson: false`** — otherwise `private` is silently reordered after `version`. Manifest key
  order is a readability choice, and a formatter should not make it.
- **`ignorePatterns: [".opencode/**", "openspec/changes/archive/**"]`** — 30 of the 65 affected Markdown
  files are archived change records, immutable histories of what was specified and validated at a past
  point; 18 are vendored agent-tooling files. Together they are 48 of 169 affected files, and neither is
  authored for this repository's style. Live `openspec/specs/**` and `docs/**` stay in scope because the
  project does own and edit them. Reversible by deleting one line.
- **`overrides: [{ files: ["src/index.css"], options: { tabWidth: 4 } }]`** — `src/index.css` is
  shadcn-provided and indented 4 spaces; the 2-space default turned it into a 408-line whitespace diff. The
  override cuts that to 18 lines and keeps the file consistent with what `shadcn add` will regenerate.

Net effect: **120 tracked files, ~14,153 changed lines**, of which 54 are TSX, 45 TS, 17 Markdown, 2 YAML,
1 JSON, 1 CSS. Zero files change under the two ignored paths.

### 3. Zero-dependency hook installation

`core.hooksPath` is set by a `prepare` script, which `pnpm install` runs automatically:

```json
"scripts": { "prepare": "git config core.hooksPath .githooks" }
```

This was verified end to end under the project's pnpm (11.20.0) and Node (22.22.2). On a fresh clone
`pnpm install` runs `prepare`, sets the path, and a subsequent failing hook exits 1 and prevents the commit.

**Correction found during implementation.** An earlier draft of this decision claimed the hooks "self-heal
on every install". That is false for pnpm 11: when the tree is already up to date, `pnpm install` skips
lifecycle scripts entirely. Verified that neither `prepare` nor `postinstall` runs in that state, and that
`pnpm install --force` does not run them either. `prepare` fires on a fresh clone and whenever a dependency
change causes real install work, but not on a no-op install.

The requirement this decision serves — a fresh clone enables hooks through an install-time step — is still
met, and hooks never break silently once set, because `core.hooksPath` persists in local git config. What
is genuinely possible is a clone installed with `--ignore-scripts`, or a contributor who unsets the value,
ending up with no hooks and no error. Recovery is therefore a documented one-liner rather than an automatic
repair, and both the bypass and that recovery command are required documentation.

### 4. Pre-commit runs only fast, unconditional gates

This is the decision that most diverges from the original issue, which proposed running the type check on
commit and gating the OpenSpec check on whether OpenSpec artifacts were staged. Measurement argues for
unconditional and narrow instead:

- The fast gates together cost ~1.4 s — less than `tsc -b` alone — so a pre-commit gate dominated by
  `tsc -b` at 4.0 s is strictly worse for a feedback loop that runs on every save-to-commit.
- `tsc -b` shows no useful incrementality on this tree: 4.0 s forced and 4.0 s incremental. Conditioning it
  on staged paths cannot recover time that the compiler is not returning.
- Full `oxlint` is 0.7 s, which is cheaper than any shell logic that would decide whether to run it, so
  selective linting buys nothing and adds a fragile path-filtering layer.
- `openspec validate --all` is 0.6 s and already green. Unconditional is both simpler than staging-based
  selection and strictly better coverage, since it also catches specs invalidated by an unrelated edit.
  OpenSpec's own CLI annotates `validate --archived` as being "for pre-commit linting", so this path is
  intended.

So pre-commit is: format staged files and re-stage, full `oxlint`, `openspec validate --all`. Type checking
and tests are deferred to pre-push, which still satisfies the acceptance criterion that a type error blocks
a commit **or push** check — nothing leaves the machine without it.

### 5. `check` composes gates so the type check runs once

`build` is already `tsc -b && vite build`. A `check` of `format:check && lint && typecheck && test && build`
would therefore type check twice for no added coverage. Instead:

```
check = format:check && lint && test && build
```

`tsc -b` runs exactly once, through `build`, and type errors still fail the gate. `typecheck` still ships as
a standalone script for on-demand use, satisfying the "run the type check independently" requirement without
paying for it twice.

### 6. Format-and-restage rather than fail-and-tell

The pre-commit hook writes the formatter's output for staged files and re-stages them, which is what
lint-staged does and the least surprising behavior. The known footgun is recorded under Risks.

### 7. Narrow `oxlint` override instead of splitting shadcn files

The alternative ways to clear the three warnings were rejected: moving `cva` results into separate modules
would fight the shadcn CLI, which regenerates these files and would restore the violation; inline
`oxlint-disable` comments would be wiped by the next `shadcn add`. A committed `overrides` entry scoped to
`src/components/ui/**/*.tsx` was verified to take the baseline to **0 warnings, 0 errors** in 22 ms, and
`--deny-warnings` then also exits zero — which is what makes a future warning-as-error policy a config
change. The rule stays active everywhere else, so a genuine new violation outside that directory is still
reported.

### 8. A separate `ci.yml` rather than extending `deploy.yml`

Deployment needs `pages: write` and `id-token: write`; validation needs `contents: read`. Keeping them in
separate workflows is what makes that permission split honest and guarantees a pull request can never reach
a deploy step. Both invoke the same `pnpm check`, so there is no duplicated command logic to drift. The
trade-off is that a push to `main` runs the gate twice (~20 s), which is cheaper than the `workflow_run`
chaining that would avoid it.

## Risks / Trade-offs

- **The chosen semicolon style is new to this repository, and fights shadcn.** Only one file in `src`
  currently contains a semicolon, and shadcn's own output is semicolon-free, so `shadcn add` and shadcn
  updates will keep producing semicolon-free code that the formatter rewrites. This is recurring but
  self-healing: the pre-commit hook formats staged files automatically, so the gate never blocks and the
  only cost is a diff on shadcn-managed files. If that churn proves annoying, flipping `"semi": false` in
  `.oxfmtrc.json` is a one-line change that would also have halved the reformat.
- **The reformat commit is large.** ~14,153 changed lines across 120 files, roughly 46% of which are
  added semicolons. It is isolated in its own commit with no behavioral change, and should be merged or
  reviewed independently of the tooling commit so the tooling diff stays legible.
- **Partially staged files can over-stage.** If a file has both staged and unstaged changes, formatting the
  working-tree copy and re-staging it will also stage the unstaged edits. lint-staged has the identical
  behavior. Mitigation is documentation, plus `--no-verify` for the rare deliberate case.
- **Hooks may be inactive with no error.** `pnpm install` only runs `prepare` when it does real work, so a
  clone installed with `--ignore-scripts` — or a contributor who unsets `core.hooksPath` — ends up with no
  hooks and no diagnostic. Mitigation: the recovery command is required documentation, and any pre-push or
  CI failure is still caught remotely.
- **oxfmt is pre-1.0.** A breaking change in a future release could alter output. Mitigated by the verified
  Prettier equivalence: worst case is adopting Prettier with the same options and a much smaller diff than
  the original adoption.
- **Ignoring archived change records leaves them permanently unformatted.** Intentional, but it means the
  archive and the live tree will diverge stylistically over time. Accepted, since the archive is a record,
  not maintained prose.

## Migration Plan

1. Land the tooling configuration and the clean lint baseline **before** the reformat, so the reformat
   commit is provably style-only.
2. Apply the reformat as its own commit touching no logic, and confirm `pnpm test` and `pnpm build` are
   unchanged in behavior across it.
3. Enable the hooks and the CI workflow, then collapse `deploy.yml` onto `pnpm check`.
4. Rollback: revert the reformat commit and the tooling commit independently. Reverting the tooling commit
   restores the prior three-step deploy workflow; reverting the reformat is a no-op for behavior. If hooks
   need disabling urgently without touching history, `git config --unset core.hooksPath` is sufficient and
   local.

## Open Questions

None. The remaining deferrable items — enabling warning-as-error, and addressing the Vite chunk-size
warning — are separate changes that do not alter this approach, the specs, or the task breakdown.
