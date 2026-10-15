/**
 * Fails the build on a markdown link that points at a file that is not there.
 *
 * A deleted file whose path is still linked leaves a broken reference in the
 * tree, and nothing else notices: the formatter formats what is there, the
 * linter has nothing to say, and tests never read markdown. Wired into
 * `pnpm check`, so it runs before every push and in CI.
 *
 * Deliberately skipped: `.agents/` and `.opencode/` are vendored tooling whose
 * docs carry illustrative paths (`[x](./src/billing/GLOSSARY.md)`) and
 * placeholders (`[link](link)`) that are not real references. `openspec/` is
 * NOT skipped — it is checked like any other markdown.
 */

import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".agents", ".opencode"]);

/** Every markdown file in the repo, except the vendored tooling directories. */
function markdownFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) found.push(full);
    }
  };
  walk(root);
  return found;
}

/** Local links that resolve to a path that does not exist. */
function brokenLinks(root) {
  const broken = [];
  for (const file of markdownFiles(root)) {
    const source = fs.readFileSync(file, "utf8");
    for (const [, target] of source.matchAll(/\]\(([^)\s]+)/g)) {
      // External URLs and bare anchors have nothing to resolve against. A
      // `#fragment` is stripped: the link check is about the file, not the
      // heading inside it.
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), target.split("#")[0]);
      if (!fs.existsSync(resolved)) broken.push(`${file} -> ${target}`);
    }
  }
  return broken;
}

const broken = brokenLinks(process.cwd());
if (broken.length > 0) {
  console.error(`Broken markdown links (${broken.length}):`);
  for (const link of broken) console.error(`  ${link}`);
  process.exit(1);
}
