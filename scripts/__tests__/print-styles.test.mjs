import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The printable cycle summary's print rules.
 *
 * These live in plain CSS, so jsdom cannot evaluate them and no React test can see the result. What can
 * be pinned without a browser is that the block exists, that it forces light tokens onto the document's
 * own sheet rather than onto the app at large, and that it does not force a paper size. The failure
 * mode being guarded is a dark-theme session printing a dark sheet, or the block being deleted by
 * someone who never prints from the app.
 *
 * Asserted on the file rather than on a rendered element, which is why this sits beside the other
 * project-file assertions instead of under `src/`: `tsconfig.app.json` deliberately has no node types,
 * so app-side tests cannot read from the filesystem.
 */
const CSS = readFileSync(path.resolve(process.cwd(), "src/index.css"), "utf8");

/** The `@media print` block, so an assertion cannot be satisfied by a rule in another media query. */
function printBlock() {
  const start = CSS.indexOf("@media print");
  expect(start).toBeGreaterThan(-1);
  // Braces do not nest inside this file's media block, so the first closing brace ends it.
  return CSS.slice(start, CSS.indexOf("\n}", start));
}

describe("print styles (instructor-summary)", () => {
  it("has a print block", () => {
    expect(CSS).toContain("@media print");
  });

  it("forces light tokens on the document sheet, so a dark theme still prints black on white", () => {
    const block = printBlock();

    expect(block).toContain(".print-sheet");
    expect(block).toMatch(/--foreground:\s*#000000/);
    expect(block).toMatch(/--background:\s*#ffffff/);
    // The tokens the document actually resolves through have to be among the ones overridden.
    expect(block).toMatch(/--muted-foreground:/);
    expect(block).toMatch(/--border:/);
  });

  it("keeps the printed page itself light, even with background graphics enabled", () => {
    expect(printBlock()).toMatch(/html,\s*\n\s*body\s*\{[^}]*background:\s*#ffffff/);
  });

  it("un-clips the shadcn table's scroll container, which would otherwise cut the sheet off", () => {
    expect(printBlock()).toMatch(
      /\.print-sheet \[data-slot="table-container"\]\s*\{[^}]*overflow:\s*visible/,
    );
  });

  it("gives rows a rule that survives colour being removed", () => {
    expect(printBlock()).toContain('[data-slot="table-row"]');
  });

  it("sets page margins without forcing a paper size", () => {
    const block = printBlock();

    expect(block).toMatch(/@page\s*\{[^}]*margin/);
    expect(block).not.toMatch(/@page\s*\{[^}]*\bsize\s*:/);
  });
});
