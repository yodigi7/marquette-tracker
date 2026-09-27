---
description: "Merge PRs, verify, archive changes, and close issues"
---

Merge pull request(s) $ARGUMENTS end to end.

Work through each PR number in $ARGUMENTS in order. For each one:

1. **Read the PR** with the GitHub MCP tools. Note the title, body, state, head branch, and base branch. If the PR is already merged or closed, skip it and note that.
2. **Find the linked change and issue** from the PR body. Look for "OpenSpec change" (a change name) and "Closes #NN" or "Fixes #NN" (an issue number). If either is missing, note it and continue — don't guess.
3. **Rebase onto main.** Fetch the latest main, then rebase the PR branch onto it in a temporary worktree. If a conflict needs a product decision to resolve, stop and report which PR and what conflicted. Do not guess.
4. **Merge.** Push the rebased branch to main (fast-forward). If the push is rejected, stop and report.
5. **Verify.** Run `pnpm check`. If it fails, stop and report. Do not archive a broken state.
6. **Archive.** If the PR linked an OpenSpec change, archive it with `openspec archive --change <name>`.
7. **Close the issue.** If the PR linked an issue and it's still open, close it with a comment pointing at the PR. If GitHub already auto-closed it, just post the comment.
8. **Cleanup.** Delete the PR branch.

After all PRs are processed, report a summary: which merged, which changes archived, which issues closed, and anything that needed attention.
