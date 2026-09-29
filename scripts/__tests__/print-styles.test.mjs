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

/** The `@page` block that applies to every document the app prints. */
function defaultPageRule() {
  const match = /@page\s*\{[^}]*\}/.exec(CSS);
  expect(match).toBeTruthy();
  return match[0];
}

/** The `@page chart` block the instructor chart claims, which is the one allowed to name a size. */
function chartPageRule() {
  const match = /@page chart\s*\{[^}]*\}/.exec(CSS);
  expect(match).toBeTruthy();
  return match[0];
}

/** Relative luminance of a hex colour, per WCAG 2.1. */
function luminance(hex) {
  const channel = (offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two hex colours. */
function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** The tints the chart's cells carry, and the colour each one prints as. */
const CHART_TINTS = ["monitor-low", "monitor-high", "monitor-peak", "menses"];

function printTintRule(tint) {
  const match = new RegExp(`\\.print-sheet \\.bg-fertility-chart-${tint}\\s*\\{[^}]*\\}`).exec(CSS);
  expect(match, `print rule for ${tint}`).toBeTruthy();
  return match[0];
}

function printedColour(tint) {
  const hex = /100vmax (#[0-9a-f]{6})/.exec(printTintRule(tint));
  expect(hex, `printed colour for ${tint}`).toBeTruthy();
  return hex[1];
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

describe("print styles (instructor chart)", () => {
  it("gives the chart its own landscape page, and leaves every other document's page alone", () => {
    // `@page` is document-level, so the only way to give one document landscape without giving it to
    // the single-cycle summary is a named page the chart's sheet opts into.
    expect(chartPageRule()).toMatch(/size:\s*landscape/);
    expect(defaultPageRule()).not.toMatch(/\bsize\s*:/);
    expect(printBlock()).toMatch(/\.chart-page\s*\{[^}]*page:\s*chart/);
  });

  it("tints with a shadow rather than a background, because a browser drops backgrounds when printing", () => {
    // A print action discards element backgrounds unless the reader ticks "Background graphics", and it
    // does so before any rule here is consulted — so a background-painted tint is simply missing from a
    // PDF saved with the default setting. A shadow is not a background, so it prints either way.
    for (const tint of CHART_TINTS) {
      const rule = printTintRule(tint);
      expect(rule, tint).toContain("box-shadow: inset");
      // And the background is explicitly cleared, so the screen tint is not painted underneath it.
      expect(rule, tint).toContain("background-color: transparent");
      expect(rule, tint).not.toMatch(/background-color: (?!transparent)/);
    }
  });

  it("prints the tints strongly enough to be seen on paper", () => {
    // An earlier pass tinted at 16%, which resolved to a near-white wash: present in the file and
    // effectively absent on a printed page. This is the guard against going back to that, measured
    // rather than judged by eye. Paper is about 0.95 luminance, so a wash near that is invisible.
    for (const tint of CHART_TINTS) {
      const wash = luminance(printedColour(tint));
      expect(wash, `${tint} is dark enough to see on paper`).toBeLessThan(0.6);
      // And still a tint rather than a block of ink.
      expect(wash, `${tint} is still a tint`).toBeGreaterThan(0.25);
    }
  });

  it("keeps the sheet's text readable on every printed tint", () => {
    // Black is the foreground the print rules force onto the sheet, so this is the contrast a printed
    // value is read at. The project requires 4.5:1.
    for (const tint of CHART_TINTS) {
      expect(contrast(printedColour(tint), "#000000"), tint).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("leaves the fertile band a solid fill, which is the mark that survives a photocopy", () => {
    // A pale wash would nearly vanish in a bad photocopy, so the band is not tinted at all.
    expect(CSS).not.toMatch(/bg-fertility-chart[^\n]*band/);
    expect(printBlock()).not.toMatch(/\.bg-fertility-chart-band/);
  });
});
