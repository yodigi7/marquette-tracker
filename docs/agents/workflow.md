# Workflow

How work moves from an idea to a merge here, and what each step hands you back. Read before starting a
feature, a bug fix, or anything you would otherwise plan by hand.

The skills live in `.agents/skills/`. They are **user-invoked**: mention `@skill-name` and they appear.
They will never show up in a picker, so this file is the index.

## Main flow

| Step                | Skill                                                       | Hands you back                                                   |
| ------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Sharpen the idea    | `@grill-with-docs`                                          | A shared understanding, plus a glossary and ADRs as terms settle |
| Turn it into a spec | `@to-spec`                                                  | A GitHub issue                                                   |
| Split it into work  | `@to-tickets`                                               | GitHub issues with blocking edges                                |
| Build it            | `@implement` (per ticket) or `@implement-spec` (whole spec) | The change, driven by `@tdd`                                     |
| Review before merge | `@code-review`                                              | Standards + spec findings, as two parallel reviews               |
| Shape the PR        | `@pr`                                                       | The pull request body                                            |
| Close the loop      | `@retro`                                                    | Proposed improvements to this environment                        |

`@code-review` locates the originating spec from issue references in the commit messages. Pass the ticket
number when invoking it, so it does not have to ask.

### Context hygiene

Keep the first three steps in **one unbroken context window** — don't compact or clear before
`@to-tickets` — so the grilling, spec, and tickets all build on the same thinking. Each `@implement` then
starts fresh, working from its ticket alone.

The limit is the smart zone: roughly 150k tokens on current models. If a session approaches it before
`@to-tickets`, compact at the nearest phase boundary rather than push on degraded.

## On-ramps

Work arriving from somewhere else, merging onto the main flow.

- **Bugs and requests piling up** → `@triage`. Only for issues you didn't create; tickets from
  `@to-tickets` are already agent-ready and must not be triaged.
- **Something is broken** → `@diagnosing-bugs`. For the ones that resist a first glance. It refuses to
  theorise until one command goes red on the specific bug, then fixes with a regression test. Once
  fixed, `@retro` in the same session asks what would have prevented it.
- **A huge, foggy effort** → `@wayfinder`. Charts decision tickets rather than deliverables, and hands off
  to `@to-spec` when the way is clear. Not for a well-scoped feature.
- **A question only a person can answer** → `@wizard`. Generates a bash script for provisioning, secrets,
  or third-party dashboards.
- **A design question needing runnable code** → `@prototype`. Throwaway; the answer folds into the real
  code.

## Reference skills

Reach for these directly when the **words**, not the process, are the problem.

- `@domain-modeling` — challenge a fuzzy term, resolve an overloaded word, record an ADR. Its `_Avoid_`
  lists in [`GLOSSARY.md`](../../GLOSSARY.md) are binding.
- `@codebase-design` — the deep-module vocabulary for shaping a module's interface.
- `@writing-for-agents` — writing skills, `AGENTS.md`, and anything else an agent reads.
- `@ask-matt` — a router over the whole set. It describes the upstream set, so treat its map as
  orientation rather than gospel; this file is the one that matches this repo.

## Conventions that outlive any skill

- **`pnpm check` green for any code change.** See [AGENTS.md](../../AGENTS.md).
- **`pnpm test` is required for any change touching `core/engine`**, table-driven tests written first.
- **YAGNI.** Implement what the ticket says, no more.
