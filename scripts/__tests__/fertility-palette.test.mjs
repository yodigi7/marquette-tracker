import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The monitor palette is the one place in the app where three colours must be told apart from
 * each other at 10px, on top of six different cell backgrounds. Choosing those values by eye is
 * how the previous palette shipped a light-mode Low dot at 2.90:1, below the 3:1 floor the
 * `fertility-visuals` capability requires of markers.
 *
 * This test reads the real custom properties out of `index.css` and asserts the *rules* —
 * contrast against every cell fill, and mutual separation — rather than pinning the hex values.
 * The palette stays editable; it just cannot silently drift back out of compliance.
 *
 * It lives under `scripts/` rather than `src/` because it needs `node:fs` to read the stylesheet,
 * and the app's TypeScript project deliberately has no Node types. Same reason as `icons.test.mjs`.
 */

const CSS_PATH = path.resolve(process.cwd(), "src/index.css");

const READINGS = ["low", "high", "peak"];

/** Every fill a Calendar day cell can present, resolved to sRGB hex per theme. */
const CELL_FILLS = {
  light: {
    base: "#ffffff",
    before: "#fef3c7",
    fertile: "#fecdd3",
    after: "#d1fae5",
    "post-calendar": "#f5f5f4",
    forecast: "#ede9fe",
  },
  dark: {
    base: "#0a0a0a",
    card: "#171717",
    before: "#451a03",
    fertile: "#4c0519",
    after: "#022c22",
    "post-calendar": "#292524",
    forecast: "#2e1065",
  },
};

/** The floor `fertility-visuals` sets for markers, with no slack: this is the rule itself. */
const MIN_CONTRAST = 3;

/**
 * Minimum OKLab distance between any two readings. Low/Peak was the reported bug at 0.198
 * (light) and 0.158 (dark); every pair now clears 0.25. Set at the midpoint so the guard fails on
 * the old palette and passes on the new one without being so tight that an ordinary recolour trips it.
 */
const MIN_SEPARATION = 0.25;

/** Brace-matched body of a top-level rule, so `.dark` is read whole and not line by line. */
function extractBlock(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`could not find "${selector} {" in index.css`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated "${selector} {" block in index.css`);
}

function readPalette() {
  const css = readFileSync(CSS_PATH, "utf8");
  const blocks = { light: extractBlock(css, ":root"), dark: extractBlock(css, ".dark") };
  const palette = {};

  for (const [theme, block] of Object.entries(blocks)) {
    const found = {};
    for (const reading of READINGS) {
      const match = block.match(
        new RegExp(`--fertility-monitor-${reading}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`),
      );
      if (!match) throw new Error(`missing --fertility-monitor-${reading} in the ${theme} block`);
      found[reading] = match[1];
    }
    palette[theme] = found;
  }
  return palette;
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function toLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.1 contrast ratio. */
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB -> OKLab, so separation is judged perceptually rather than per RGB channel. */
function toOklab(hex) {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function separation(a, b) {
  const [al, aa, ab] = toOklab(a);
  const [bl, ba, bb] = toOklab(b);
  return Math.hypot(al - bl, aa - ba, ab - bb);
}

const palette = readPalette();
const THEMES = ["light", "dark"];

describe("monitor palette contrast", () => {
  for (const theme of THEMES) {
    for (const reading of READINGS) {
      it(`${theme} ${reading} clears ${MIN_CONTRAST}:1 against every Calendar fill`, () => {
        const hex = palette[theme][reading];
        const failures = Object.entries(CELL_FILLS[theme])
          .map(([name, fill]) => [name, contrast(hex, fill)])
          .filter(([, ratio]) => ratio < MIN_CONTRAST)
          .map(([name, ratio]) => `${name} ${ratio.toFixed(2)}:1`);

        expect(failures, `${theme} ${reading} is ${hex}`).toEqual([]);
      });
    }
  }
});

describe("monitor palette separation", () => {
  const PAIRS = [
    ["low", "high"],
    ["high", "peak"],
    ["low", "peak"],
  ];

  for (const theme of THEMES) {
    for (const [a, b] of PAIRS) {
      it(`${theme} ${a} and ${b} are distinguishable at marker size`, () => {
        const distance = separation(palette[theme][a], palette[theme][b]);
        expect(
          distance,
          `${theme} ${a}/${b} separation is ${distance.toFixed(4)}`,
        ).toBeGreaterThanOrEqual(MIN_SEPARATION);
      });
    }
  }
});
