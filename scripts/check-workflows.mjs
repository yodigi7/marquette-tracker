/**
 * Enforces the CI/deploy split recorded in docs/agents/quality-gates.md.
 *
 * A malformed workflow is not silent: GitHub fails the run with a parse
 * error. A *valid* workflow that has drifted from the documented split is
 * silent, and nothing else in the repo would notice — `pnpm check` never
 * reads these files and `ci.yml` never reads `deploy.yml`. The failure
 * surfaces as deploys quietly stopping, or worse, a pull request reaching a
 * publish step.
 *
 * The rules enforced here, each traced to its source in that document:
 *   - ci.yml holds read-only permissions and performs no deployment
 *   - deploy.yml publishes only from main, and never on a pull request
 *   - deploy.yml keeps a manual trigger for deliberate recovery
 *   - deploy.yml keeps a file filter, and every entry it names exists
 *
 * This reads the YAML as text rather than parsing it. That is deliberate:
 * these are targeted assertions about named keys, not a general parse, and
 * it keeps the check dependency-free the way the rest of `scripts/` is.
 * Consequence: a file with unusual indentation will report as a violation
 * rather than being understood. For a false positive, reformat the workflow
 * or extend this check.
 */

import fs from "node:fs";
import path from "node:path";

const WORKFLOWS = path.join(".github", "workflows");
const violations = [];

function fail(workflow, message) {
  violations.push(`${workflow}: ${message}`);
}

/** The body of a block, e.g. everything indented under `on:` or `push:`. */
function block(text, key) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^\\s*${key}:`).test(line));
  if (start === -1) return [];
  const indent = lines[start].search(/\S/);
  const body = [];
  for (const line of lines.slice(start + 1)) {
    const blank = line.trim() === "";
    const comment = line.trimStart().startsWith("#");
    const deeper = line.search(/\S/) > indent;
    if (!blank && !comment && !deeper) break;
    body.push(line);
  }
  return body;
}

function read(file) {
  const full = path.join(WORKFLOWS, file);
  if (!fs.existsSync(full)) {
    fail(file, "does not exist");
    return null;
  }
  return fs.readFileSync(full, "utf8");
}

// --- ci.yml: read-only, never deploys -------------------------------------

const ci = read("ci.yml");
if (ci) {
  for (const elevated of ["pages: write", "id-token: write"]) {
    if (ci.includes(elevated)) {
      fail("ci.yml", `holds \`${elevated}\`, but validation must stay read-only`);
    }
  }
  if (ci.includes("actions/deploy-pages")) {
    fail("ci.yml", "contains a deploy-pages step; deployment belongs to deploy.yml");
  }
  const triggers = block(ci, "on");
  for (const required of ["pull_request", "push"]) {
    if (!triggers.some((line) => line.trim().startsWith(`${required}:`))) {
      fail("ci.yml", `does not trigger on \`${required}\``);
    }
  }
}

// --- deploy.yml: main only, filtered, manually recoverable -----------------

const deploy = read("deploy.yml");
if (deploy) {
  const triggers = block(deploy, "on");

  if (triggers.some((line) => line.trim().startsWith("pull_request:"))) {
    fail("deploy.yml", "triggers on `pull_request`; a PR must never reach a publish step");
  }

  if (!triggers.some((line) => line.trim().startsWith("push:"))) {
    fail("deploy.yml", "does not trigger on `push`");
  }

  if (!triggers.some((line) => line.trim().startsWith("workflow_dispatch:"))) {
    fail("deploy.yml", "lost `workflow_dispatch`; recovery has no manual trigger");
  }

  const push = block(triggers.join("\n"), "push");
  const branches = push.flatMap((line) => [line]).filter((line) => /^\s*-\s*main\s*$/.test(line));
  if (branches.length === 0) {
    fail("deploy.yml", "does not limit `push` to the main branch");
  }

  for (const elevated of ["pages: write", "id-token: write"]) {
    if (!deploy.includes(elevated)) {
      fail("deploy.yml", `is missing \`${elevated}\` and cannot publish to Pages`);
    }
  }

  // The filter: present, non-empty, and every entry it names must exist. A
  // renamed or moved directory silently stops triggering deployments, which
  // is the failure this check exists to prevent.
  const pathIndex = push.findIndex((line) => line.trim() === "paths:");
  if (pathIndex === -1) {
    fail("deploy.yml", "has no `paths` filter; every push to main will rebuild");
  } else {
    const entries = [];
    for (const line of push.slice(pathIndex + 1)) {
      const match = line.match(/^\s*-\s*(\S+)\s*$/);
      if (match) entries.push(match[1]);
      else if (line.trim() !== "" && !line.trim().startsWith("#")) break;
    }
    if (entries.length === 0) {
      fail("deploy.yml", "has an empty `paths` filter, which matches nothing");
    }
    for (const entry of entries) {
      const target = entry.endsWith("/**") ? entry.slice(0, -3) : entry;
      if (!fs.existsSync(target)) {
        fail("deploy.yml", `filter names \`${entry}\`, which does not exist`);
      }
    }
  }
}

// --- report ---------------------------------------------------------------

if (violations.length > 0) {
  console.error(`Workflow split violated (${violations.length}):`);
  for (const violation of violations) console.error(`  ${violation}`);
  console.error("\nSee docs/agents/quality-gates.md for what these rules protect.");
  process.exit(1);
}
