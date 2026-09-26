# Tasks

Sequencing note: `package.json` is edited by groups 1, 3, and 4 — those groups are strictly sequential, never
parallel. `.oxfmtrc.json` and `.oxlintrc.json` are distinct files, so groups 1 and 2 may run in parallel.

## 1. Formatter toolchain

- [x] 1.1 Add `oxfmt` as a devDependency (`pnpm add -D oxfmt`) and verify `pnpm exec oxfmt --version` reports a version
- [x] 1.2 Create `.oxfmtrc.json` with oxfmt defaults plus the three exceptions: `"sortPackageJson": false`,
      `"ignorePatterns": [".opencode/**", "openspec/changes/archive/**"]`, and an override setting
      `"tabWidth": 4` for `src/index.css`; verify the file parses and that `pnpm exec oxfmt --check .` reports
      the expected pending set rather than an error
- [x] 1.3 Verify the ignore paths are effective by confirming `pnpm exec oxfmt --check` lists no file under
      `.opencode/` or `openspec/changes/archive/`, and that it does list files under `openspec/specs/`

## 2. Lint baseline

- [x] 2.1 [P] Add an `overrides` entry to `.oxlintrc.json` scoping `react/only-export-components` to `off`
      for `src/components/ui/**/*.tsx` only; verify `pnpm lint` reports 0 warnings and 0 errors
- [x] 2.2 [P] Verify `pnpm exec oxlint --deny-warnings` exits zero, confirming the baseline is clean enough
      that a future warning-as-error policy needs no code changes
- [x] 2.3 [P] Verify the exception is narrow by introducing a temporary `react/only-export-components`
      violation in a file outside `src/components/ui/`, confirming `pnpm lint` reports it, then reverting
- [x] 2.4 [P] Verify no tool-specific inline suppression comments were added to `src/components/ui/`, so
      `shadcn add` regenerating those files cannot silently drop the exception

## 3. Command surface

- [x] 3.1 Add `"format": "oxfmt --write ."`, `"format:check": "oxfmt --check ."`, and
      `"typecheck": "tsc -b"` to `package.json` scripts; verify each runs and that `format:check` leaves
      files on disk unmodified when reporting differences
- [x] 3.2 Add `"check": "pnpm format:check && pnpm lint && pnpm test && pnpm build"`; verify it does NOT
      also invoke `typecheck`, so the strict project check runs exactly once through `build`
- [x] 3.3 Add `"prepare": "git config core.hooksPath .githooks"` to `package.json`; verify a fresh-clone
      `pnpm install` sets `core.hooksPath` to `.githooks`. NOTE: pnpm 11 skips lifecycle scripts on an
      already-up-to-date install (verified for `prepare`, `postinstall`, and `--force`), so this fires on a
      fresh clone or a real dependency change, not on every install — design.md §3 and its Risks entry were
      corrected to match, and the recovery one-liner is now a documentation requirement

## 4. One-time reformat

- [x] 4.1 With groups 1 and 2 complete, run `pnpm format`; verify exactly 120 tracked files changed and that
      zero changed files fall under `.opencode/` or `openspec/changes/archive/`. Result: exactly 120
      formatter-changed files (54 tsx, 45 ts, 17 md, 2 yaml, 1 json, 1 css), 14,092 changed lines, 0 under
      the ignored paths. The 3 further modified files are the `.oxlintrc.json`/`package.json`/`pnpm-lock`
      edits from groups 1-3, not formatter output
- [x] 4.2 Verify the reformat is style-only by confirming `pnpm test` and `pnpm build` both remain green and
      that `git diff` shows no changed identifiers, literals, or control flow. Result: 369/369 tests, build
      green, lint 0/0. Additionally verified all 99 changed TS/TSX files with a position-independent AST walk:
      identifiers, literals, operators, JSX elements/attributes, and control flow are identical everywhere.
      Only three files differ in node shape, all benign: `status-card.tsx` and `data-backup-section.tsx` have
      `{" "}` inserted where a line break would otherwise swallow a space, and `status/index.tsx` gains one
      whitespace-only text node that JSX discards. Rendered output is identical, confirmed by the 23
      component tests covering those files
- [x] 4.3 Verify `src/core/engine/marquette.ts` and its table-driven tests are byte-identical apart from
      formatting, confirming the Marquette algorithm is untouched. Result: all six `src/core/engine`
      production and test files are AST-identical (888/374/2950/566/318/545 nodes respectively)
- [x] 4.4 Commit the reformat on its own with no logic changes; verify `git show --stat` for that commit
      contains only formatting, so it can be reviewed or reverted independently of the tooling commits.
      Result: commit `322b196`, 120 files, no tooling or config file included

## 5. Git hooks

- [x] 5.1 Create `.githooks/pre-commit` that collects staged supported files via
      `git diff --cached --name-only --diff-filter=ACMR`, runs `oxfmt --write` on them, re-stages them with
      `git add`, then runs full `oxlint` and `openspec validate --all`; verify the script is `sh -n` clean
- [x] 5.2 Create `.githooks/pre-push` that runs `pnpm check`; verify the script is `sh -n` clean
- [x] 5.3 `chmod +x` both hooks and verify both are tracked by git as executable, satisfying the
      "hooks are versioned, not local-only" requirement. Result: both tracked at mode `100755`
- [x] 5.4 Demonstrate a clean staged change commits successfully with the hook active. Result: the tooling
      commit landed in 3.1s with all three gates green
- [x] 5.5 Demonstrate a staged formatting deviation is auto-fixed and re-staged, with the created commit
      containing the formatted content. Result: `{a:1,   b:   2}` was committed as `{ a: 1, b: 2 };` and the
      tree was clean afterwards, proving the fix was re-staged rather than left behind
- [x] 5.6 Demonstrate a staged lint error blocks the commit and reports the violation. Result: a conditional
      `useState` produced a `rules-of-hooks` error, the hook exited 1, and no commit was created
- [x] 5.7 Demonstrate an invalid staged OpenSpec artifact blocks the commit. Result: removing the scenarios
      from one requirement produced `must include at least one scenario`, the hook exited 1, and no commit
      was created
- [x] 5.8 Demonstrate a failing test blocks a pre-push attempt, and that a green tree pushes. Result: against
      a local bare remote, a failing test blocked the push (0 refs written); the green tree pushed in 21.8s,
      matching the design's ~21s estimate. The Vite chunk-size warning surfaced as non-blocking
- [x] 5.9 Verify `git commit --no-verify` and `git push --no-verify` bypass the hooks, so the documented
      escape hatch actually works. Result: a commit carrying both a lint error and a failing test succeeded
      with `--no-verify`, and pushed with `push --no-verify`. All demo scaffolding (probe files, throwaway
      branch, local remote, and the junk probe commit) was removed afterwards

## 6. CI workflows

- [x] 6.1 [P] Add `.github/workflows/ci.yml` triggered on `pull_request` and `push` to `main`, with
      `permissions: contents: read`, that installs dependencies and runs `pnpm check`; verify the YAML parses
      and the workflow contains no deploy step and no `pages: write` or `id-token: write` permission.
      Result: parses; triggers and `contents: read` confirmed; no deploy step, no elevated permissions
- [x] 6.2 [P] Update `.github/workflows/deploy.yml` to replace its separate test, lint, and build steps with
      the single `pnpm check` step; verify its triggers (`push` to `main`, `workflow_dispatch`) and its
      `pages: write` / `id-token: write` permissions are unchanged. Result: the diff is exactly the
      three-steps-to-one consolidation; triggers, permissions, and deploy steps untouched
- [x] 6.3 Verify both workflows invoke the identical canonical command, so local and remote validation cannot
      drift apart. Result: both contain the single line `run: pnpm check` and nothing else as a gate

## 7. Documentation

- [x] 7.1 Update `README.md` with the new scripts (`format`, `format:check`, `typecheck`, `check`), the
      install-time hook activation, the `--no-verify` bypass, and recovery steps for restoring hooks
- [x] 7.2 Document in `README.md` the formatter's file-type coverage, the three configuration exceptions, and
      that archived change records and vendored tooling are deliberately excluded. Also corrected the
      Deployment section, which still described the old three-step test/lint/build gate
- [x] 7.3 Update `AGENTS.md` so its command gates reference the canonical `check` command and record the
      hook conventions contributors are expected to follow. Also replaced the four stale `npm run ...`
      references with `pnpm`

## 8. Final verification

- [x] 8.1 Verify `pnpm check` exits zero, `pnpm format:check` reports no differences, and
      `openspec validate --all --no-interactive` reports all specs passing. Result: `pnpm check` exits 0 in
      21.8s, running the four gates in order with `tsc -b` invoked exactly once; 369/369 tests; lint 0/0;
      `openspec validate --all` reports 12/12 items passing
- [x] 8.2 Verify the full Vitest suite passes with no test files modified by this change. Result: 369/369
      pass, and all 34 test files are AST-identical to their pre-change state at `3b3da88`, so the reformat
      changed no test logic
- [x] 8.3 Verify `git status` is clean apart from the intended commits, confirming no stray formatter
      output or scratch artifacts were left in the tree. Result: only `tasks.md` (progress tracking) and the
      pre-existing untracked `opencode.json` remain; no probe files, scratch scripts, or throwaway branches
      or remotes survive anywhere in the repo
