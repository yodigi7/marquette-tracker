/**
 * Write every icon the project ships.
 *
 * Run with `pnpm icons`. The artwork itself lives in `scripts/icons.mjs`; this
 * file only writes what that module produces, so the committed icons can always
 * be reproduced from the repository with no additional tooling.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OUTPUTS, build } from "./icons.mjs";

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

for (const output of OUTPUTS) {
  const target = path.join(PUBLIC_DIR, output.file);
  writeFileSync(target, build(output));
  console.log(`wrote public/${output.file}`);
}

console.log(`\n${OUTPUTS.length} icon files written from scripts/icons.mjs`);
