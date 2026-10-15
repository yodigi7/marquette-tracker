# Quality gates

What has to be green before a change is done, and the few rules no config file states on its own.

## The gate

**`pnpm check` green for any code change.** It runs `format:check`, `lint`, `test`, then `build`, and is
the only command that needs to be green. The git hooks and both CI workflows invoke exactly that
command, so what passes locally is what CI runs.

**`pnpm test` is required for any change touching `core/engine`**, with table-driven tests written first.
`@tdd` agrees the test seams with the user before writing a test; the engine's seams are already fixed by
the protocol rules in [`src/core/engine/AGENTS.md`](../../src/core/engine/AGENTS.md).

## Where the mechanics live

Do not restate these here — read them:

- **Scripts** — `package.json`.
- **Git hooks** — `.githooks/`, enabled at install time by a `prepare` script that sets
  `core.hooksPath`. Each hook's header states what it runs, how long it takes, and why it is shaped that
  way. `pnpm install` only runs `prepare` when it does real work, so a no-op install will not repair an
  unset hook path: `git config core.hooksPath .githooks`.
- **CI and deploy** — `.github/workflows/`. `ci.yml` validates; `deploy.yml` publishes to Pages.
- **Formatting** — `.oxfmtrc.json`.
- **Lint** — `.oxlintrc.json`.

## Gotchas

These are the ones a config file cannot confess:

- **`src/components/ui/` is the only directory carrying a lint override**, and it lives in
  `.oxlintrc.json`. Keep any fix there rather than in an inline comment — `shadcn add` rewrites those
  files and would wipe inline disables.
- **`ci.yml` validates, `deploy.yml` publishes to Pages.** A deploy step never goes in `ci.yml`; keeping
  the two separate is what guarantees a pull request cannot reach a publish step.
- **oxfmt is the only formatter.** Add none beside it.
- **Bypass deliberately.** `git commit --no-verify` / `git push --no-verify` are for a WIP fix you will
  rebase later, not for a failing gate.
