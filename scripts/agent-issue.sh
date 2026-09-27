#!/usr/bin/env bash
# Run the `issues` agent against one or more GitHub issues, each in its own git
# worktree, so several can run at the same time without touching each other or
# your working tree.
#
#   ./scripts/agent-issue.sh 42
#   ./scripts/agent-issue.sh 42 43 44        # in parallel
#   ./scripts/agent-issue.sh 42 --keep       # leave the worktree for inspection
#   ./scripts/agent-issue.sh 42 --base my-wip-branch
#
# The agent explores, proposes, implements, and verifies, then opens a pull
# request. This script only builds an isolated worktree per issue, points the
# agent at it, and cleans up on success.

set -euo pipefail

usage() {
  cat <<'EOF'
usage: agent-issue.sh [options] <issue-number>...

options:
  --base <ref>       Branch the worktrees are created from. Default: origin/main
  --keep             Keep worktrees even after a successful run
  --no-install       Skip `pnpm install` in each worktree
  --timeout <secs>   Kill a run that exceeds this. Default: 10800 (3h)
  -h, --help         Show this

The agent file must exist on <ref>. Commit it before running.
EOF
}

BASE="origin/main"
KEEP=0
DO_INSTALL=1
TIMEOUT=10800
declare -a ISSUE_ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --base)
      [ $# -ge 2 ] || { echo "error: --base needs a value" >&2; exit 2; }
      BASE="$2"
      shift 2
      ;;
    --keep)
      KEEP=1
      shift
      ;;
    --no-install)
      DO_INSTALL=0
      shift
      ;;
    --timeout)
      [ $# -ge 2 ] || { echo "error: --timeout needs a value" >&2; exit 2; }
      TIMEOUT="$2"
      shift 2
      ;;
    -*)
      echo "error: unknown option $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      ISSUE_ARGS+=("$1")
      shift
      ;;
  esac
done

if [ ${#ISSUE_ARGS[@]} -eq 0 ]; then
  usage >&2
  exit 2
fi

for i in "${ISSUE_ARGS[@]}"; do
  if ! [[ "$i" =~ ^[0-9]+$ ]]; then
    echo "error: '$i' is not an issue number" >&2
    exit 2
  fi
done

# --- preconditions -------------------------------------------------------

command -v opencode >/dev/null 2>&1 || { echo "error: opencode is not on PATH." >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "error: git is not on PATH." >&2; exit 1; }

git rev-parse --git-dir >/dev/null 2>&1 || { echo "error: not inside a git repository." >&2; exit 1; }
git remote get-url origin >/dev/null 2>&1 || { echo "error: no 'origin' remote." >&2; exit 1; }

GIT_COMMON="$(git rev-parse --path-format=absolute --git-common-dir)"
MAIN_ROOT="$(dirname "$GIT_COMMON")"
WORKTREE_PARENT="${MAIN_ROOT}/.worktrees"
LOG_DIR="${MAIN_ROOT}/logs"

git fetch --quiet origin || { echo "error: git fetch failed." >&2; exit 1; }

# The agent is discovered from config on disk, so it has to exist on the base
# ref. Failing here is much clearer than "Agent not found" from deep inside a run.
if ! git cat-file -e "${BASE}:.opencode/agents/issues.md" 2>/dev/null; then
  cat >&2 <<EOF
error: .opencode/agents/issues.md does not exist on ${BASE}.

The agent is read from the worktree, so it has to be committed on the base ref.
Commit it, or pass --base pointing at a ref that has it.
EOF
  exit 1
fi

if ! git cat-file -e "${BASE}:pnpm-lock.yaml" 2>/dev/null; then
  echo "warning: no pnpm-lock.yaml on ${BASE}; pnpm install may fail." >&2
fi

if [ "$DO_INSTALL" -eq 1 ] && ! command -v pnpm >/dev/null 2>&1; then
  echo "error: pnpm is not on PATH, and --no-install was not passed." >&2
  exit 1
fi

# --- per-issue work ------------------------------------------------------

run_issue() {
  local issue="$1"
  local branch="agent/issue-${issue}"
  local wt="${WORKTREE_PARENT}/issue-${issue}"
  local log="${LOG_DIR}/agent-issue-${issue}.log"

  {
    echo "=== issue #${issue} | branch ${branch} | base ${BASE}"
    echo "=== worktree ${wt}"
    echo

    if ! git worktree add --quiet -b "$branch" "$wt" "$BASE"; then
      echo "error: could not create worktree for #${issue}." >&2
      echo "       branch '${branch}' or path '${wt}' probably already exists." >&2
      echo "       clean up with: git worktree remove --force ${wt}" >&2
      return 1
    fi

    if [ "$DO_INSTALL" -eq 1 ]; then
      echo "--- pnpm install (worktree-local node_modules, so parallel runs do not"
      echo "    share a vite cache; see the note in the commit message)" >&2
      if ! (cd "$wt" && pnpm install --frozen-lockfile --prefer-offline); then
        echo "error: pnpm install failed in ${wt}" >&2
        return 1
      fi
    fi

    # Branch and worktree path are stated here because they are known
    # authoritatively. Left to itself the agent reads .git/HEAD, which in a
    # worktree is a file pointing elsewhere, and it guesses wrong.
    local prompt="You are working GitHub issue ${issue} of yodigi7/marquette-tracker.

  worktree: ${wt}
  branch:   ${branch}
  base:     ${BASE}

Your working directory IS the worktree above and you are already on that branch.
Do not read .git to determine this, and do not create, switch, or delete
branches.

Take the issue end to end: explore, propose, apply, verify, then open a pull \
request. Read the issue and its comments first with the GitHub MCP tools. Make \
every assumption you would otherwise ask about, record it, and open the PR. \
Never merge, never push to main."

    echo "--- opencode run (timeout ${TIMEOUT}s)"
    (
      cd "$wt" || exit 1
      timeout --signal=TERM --kill-after=120 "$TIMEOUT" \
        opencode run --agent issues --auto "$prompt"
    )
    local status=$?

    if [ "$status" -eq 124 ] || [ "$status" -eq 137 ]; then
      echo
      echo "--- run exceeded ${TIMEOUT}s and was killed" >&2
    fi

    return "$status"
  } 2>&1 | tee "$log"

  # `tee` masks the status of the block above, so recover it.
  local status="${PIPESTATUS[0]}"

  if [ "$status" -eq 0 ]; then
    echo "--- #${issue} finished. log: logs/agent-issue-${issue}.log"
    if [ "$KEEP" -eq 1 ]; then
      echo "--- worktree kept at ${wt}"
    else
      git worktree remove --force "$wt" >/dev/null 2>&1 || true
      echo "--- worktree removed. branch '${branch}' still holds the commits."
    fi
  else
    echo "--- #${issue} FAILED (exit ${status}). worktree kept for inspection." >&2
    echo "    log:      logs/agent-issue-${issue}.log" >&2
    echo "    worktree: ${wt}" >&2
    echo "    clean up: git worktree remove --force ${wt}" >&2
  fi

  return "$status"
}

# --- run -----------------------------------------------------------------

mkdir -p "$WORKTREE_PARENT" "$LOG_DIR"

if [ "$DO_INSTALL" -eq 1 ] && [ -n "$(git -C "$MAIN_ROOT" status --porcelain 2>/dev/null)" ]; then
  cat >&2 <<EOF
note: your working tree has uncommitted changes. The agent will NOT see them,
      because worktrees are created from ${BASE}. If this issue depends on that
      work in progress, pass --base <your-branch> instead.
EOF
fi

echo "==> base: ${BASE}   issues: ${ISSUE_ARGS[*]}   parallel: ${#ISSUE_ARGS[@]}"
echo

declare -a PIDS=()
for issue in "${ISSUE_ARGS[@]}"; do
  run_issue "$issue" &
  PIDS+=("$!")
done

FAILED=()
for i in "${!PIDS[@]}"; do
  if ! wait "${PIDS[$i]}"; then
    FAILED+=("${ISSUE_ARGS[$i]}")
  fi
done

echo
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "==> all ${#ISSUE_ARGS[@]} issue(s) completed. Each should have a PR and an"
  echo "    assumptions comment. Review those before merging anything."
  exit 0
fi

echo "==> finished with failures: ${FAILED[*]}" >&2
echo "    worktrees and logs are kept for the failed issues." >&2
exit 1
