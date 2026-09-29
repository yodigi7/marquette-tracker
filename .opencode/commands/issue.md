---
description: "Work a GitHub issue end to end and open a PR with its assumptions"
agent: issues
---

Work GitHub issue $1 in `yodigi7/marquette-tracker` end to end: explore,
propose, apply, verify, then open a pull request.

Read the issue and its comments with the GitHub MCP tools before doing anything
else. The issue number is $1.

If $1 is empty, stop and report that an issue number is required.

**Work on a new branch from `origin/main`.** Fetch `origin/main`, then create
and check out branch `agent/issue-$1` starting from `origin/main` — not from
local `main`. If the branch already exists, report and stop. Do all work on
that branch: run `pnpm install`, `pnpm check`, and every git command there.
When the PR is open and the work is committed, check out `main` again.

Follow the phases and the assumption rules in your instructions. Make every
assumption you would otherwise ask about, record it, and open the PR.
