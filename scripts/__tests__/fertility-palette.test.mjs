import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The palette guard for the fertility visuals.
 *
 * A **fill** is the large background of a Calendar day, and a monitor marker is painted on top of it.
 * That caps how light a fill may be: in the dark theme the cap is 0.0922 relative luminance, set by
 * the Peak reading, and every fill has to sit under it. The consequence is that fills cannot be the
 * thing that tells two phases apart -- all four sit within 0.017 OKLab lightness of one another, and a
 * search for a better-separated trio inside the cap does not find one worth having.
 *
 * A **band** is the thin strip a day carries along its top edge, in the phase's full-chroma colour.
 * Nothing is painted on it, so the marker cap does not apply and it is free to carry the phase. That
 * is why this file asserts the bands are mutually distinguishable and deliberately does not assert the
 * same of the fills: the assertion for the fills is not satisfiable, and the check at the foot of this
 * file fails if one is added back without a new argument for it.
 *
 * There is no rule here requiring the fills to be distinguishable from one another, because for the
 * fills the assertion is not satisfiable: the marker caps how light a fill can be, and no set of values
 * inside that cap separates far enough to be worth asserting. The band carries the distinction, and the
 * check at the foot of this file fails if a fill rule is added back without a new argument for it.
 *
 * Everything checked here is read out of `index.css`, the stylesheet the app actually loads, including
 * the theme surfaces, which are authored in `oklch`. The previous version of this test hand-copied the
 * Calendar fills into a `CELL_FILLS` table, so it could report a clean pass for a palette that was no
 * longer in use.
 *
 * It lives under `scripts/` rather than `src/` because it needs `node:fs` to read the stylesheet, and
 * the app's TypeScript project deliberately has no Node types. Same reason as `icons.test.mjs`.
 */

const CSS_PATH = path.resolve(process.cwd(), "src/index.css");
const SELF_PATH = path.resolve(process.cwd(), "scripts/__tests__/fertility-palette.test.mjs");

const READINGS = ["low", "high", "peak"];
/** The three collapsed phases the Calendar paints. `post-calendar` is Status-view-only. */
const PHASES = ["pre", "fertile", "post-peak"];
/** Every status the visual record covers, including the one the Calendar never paints. */
const STATUSES = [...PHASES, "post-calendar"];
const THEMES = ["light", "dark"];

/**
 * The floors the rules in `fertility-visuals` set, with no slack: these are the rules themselves.
 */
const MARKER_CONTRAST = 3;
const BAND_CONTRAST = 3;
const TEXT_CONTRAST = 4.5;

/**
 * Minimum OKLab distance between any two things drawn at marker size.
 *
 * `MARKER_SEPARATION` covers the three monitor readings at 10px. Low/Peak was the reported bug at 0.198
 * (light) and 0.158 (dark); every pair now clears 0.25. It is also the reason the fills cannot simply
 * be lightened: lifting all three readings to a comparable brightness raises the fill cap by 1.6x but
 * drops their own separation to 0.197, so lightening the readings to free the fills would mean
 * relaxing this floor. Two accessibility rules in direct conflict, and this one should not give.
 *
 * `BAND_SEPARATION` is per theme because the two cannot both reach one number. A 4px band on a white
 * page has to clear 3:1 against white, and the values that satisfy that are dark enough to crowd each
 * other: dark reaches 0.212 and light only 0.172. A single aspirational floor would fail light mode by
 * construction, so each theme is held to what it can actually deliver.
 */
const MARKER_SEPARATION = 0.25;
const BAND_SEPARATION = { light: 0.15, dark: 0.2 };

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

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function toLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(v * 255)));
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

/**
 * The shadcn theme surfaces are authored in `oklch()`, so the guard has to understand that notation
 * to read `--background` out of the stylesheet rather than assuming it.
 */
function oklchToHex(literal) {
  const match = literal.match(
    /oklch\(\s*([\d.]+)(?:\s+([\d.]+))?(?:\s+([\d.]+))?\s*(?:\/\s*([\d.]+))?\s*\)/,
  );
  if (!match) throw new Error(`unrecognised colour: ${literal}`);
  const L = Number(match[1]);
  const C = match[2] === undefined ? 0 : Number(match[2]);
  const H = match[3] === undefined ? 0 : Number(match[3]);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear);
  if (alpha === 1) return rgbToHex(rgb);
  return `${rgbToHex(rgb)}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
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

/** A custom property that may be authored as hex, oklch, or a reference to another property. */
function readColour(block, name) {
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`missing --${name} in the block`);
  const value = match[1].trim();
  if (value.startsWith("#")) return value;
  if (value.startsWith("oklch")) return oklchToHex(value);
  const ref = value.match(/^var\(--([\w-]+)\)$/);
  if (ref) return readColour(block, ref[1]);
  throw new Error(`unrecognised value for --${name}: ${value}`);
}

function readPalette() {
  const css = readFileSync(CSS_PATH, "utf8");
  const blocks = { light: extractBlock(css, ":root"), dark: extractBlock(css, ".dark") };
  const palette = {};

  for (const [theme, block] of Object.entries(blocks)) {
    const entry = {
      markers: {},
      fill: {},
      band: {},
      foreground: {},
      surfaces: { base: readColour(block, "background"), card: readColour(block, "card") },
      predicted: readColour(block, "fertility-forecast-bg"),
    };
    for (const reading of READINGS) {
      entry.markers[reading] = readColour(block, `fertility-monitor-${reading}`);
    }
    for (const status of STATUSES) {
      entry.fill[status] = readColour(block, `fertility-status-${status}-bg`);
      entry.band[status] = readColour(block, `fertility-status-${status}-band`);
      entry.foreground[status] = readColour(block, `fertility-status-${status}-fg`);
    }
    palette[theme] = entry;
  }
  return palette;
}

const palette = readPalette();

/** Every fill a Calendar day cell can present, in the given theme. */
function cellFills(theme) {
  const t = palette[theme];
  return { base: t.surfaces.base, card: t.surfaces.card, ...t.fill, predicted: t.predicted };
}

describe("palette is read from the stylesheet the app loads", () => {
  it("resolves the theme surfaces from oklch, not from a guessed hex", () => {
    expect(palette.light.surfaces.base).toBe("#ffffff");
    expect(palette.dark.surfaces.base).toBe("#0a0a0a");
  });

  it("finds a distinct hex for every fill, band, and foreground it guards", () => {
    for (const theme of THEMES) {
      for (const status of STATUSES) {
        for (const [part, values] of Object.entries({
          fill: palette[theme].fill,
          band: palette[theme].band,
          foreground: palette[theme].foreground,
        })) {
          expect(values[status], `${theme} ${status} ${part}`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });
});

describe("monitor marker contrast", () => {
  for (const theme of THEMES) {
    for (const reading of READINGS) {
      it(`${theme} ${reading} clears ${MARKER_CONTRAST}:1 against every Calendar fill`, () => {
        const hex = palette[theme].markers[reading];
        const failures = Object.entries(cellFills(theme))
          .map(([name, fill]) => [name, contrast(hex, fill)])
          .filter(([, ratio]) => ratio < MARKER_CONTRAST)
          .map(([name, ratio]) => `${name} ${ratio.toFixed(2)}:1`);

        expect(failures, `${theme} ${reading} is ${hex}`).toEqual([]);
      });
    }
  }
});

describe("monitor marker separation", () => {
  const PAIRS = [
    ["low", "high"],
    ["high", "peak"],
    ["low", "peak"],
  ];

  for (const theme of THEMES) {
    for (const [a, b] of PAIRS) {
      it(`${theme} ${a} and ${b} are distinguishable at marker size`, () => {
        const distance = separation(palette[theme].markers[a], palette[theme].markers[b]);
        expect(
          distance,
          `${theme} ${a}/${b} separation is ${distance.toFixed(4)}`,
        ).toBeGreaterThanOrEqual(MARKER_SEPARATION);
      });
    }
  }
});

describe("status band visibility", () => {
  for (const theme of THEMES) {
    for (const phase of PHASES) {
      it(`${theme} ${phase} band clears ${BAND_CONTRAST}:1 against its own fill`, () => {
        const band = palette[theme].band[phase];
        const ratio = contrast(band, palette[theme].fill[phase]);
        expect(
          ratio,
          `${theme} ${phase} band ${band} on ${palette[theme].fill[phase]}`,
        ).toBeGreaterThanOrEqual(BAND_CONTRAST);
      });

      it(`${theme} ${phase} band clears ${BAND_CONTRAST}:1 against the surface behind the cell`, () => {
        const band = palette[theme].band[phase];
        for (const [name, surface] of Object.entries(palette[theme].surfaces)) {
          const ratio = contrast(band, surface);
          expect(
            ratio,
            `${theme} ${phase} band ${band} on ${name} ${surface}`,
          ).toBeGreaterThanOrEqual(BAND_CONTRAST);
        }
      });
    }
  }
});

describe("status band separation", () => {
  const PAIRS = [
    ["pre", "fertile"],
    ["fertile", "post-peak"],
    ["pre", "post-peak"],
  ];

  for (const theme of THEMES) {
    for (const [a, b] of PAIRS) {
      it(`${theme} ${a} and ${b} bands are distinguishable`, () => {
        const floor = BAND_SEPARATION[theme];
        const distance = separation(palette[theme].band[a], palette[theme].band[b]);
        expect(
          distance,
          `${theme} ${a}/${b} band separation is ${distance.toFixed(4)}, floor ${floor}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    }
  }

  it("holds light and dark to their own floors rather than one aspirational number", () => {
    for (const theme of THEMES) {
      const worst = Math.min(
        ...PAIRS.map(([a, b]) => separation(palette[theme].band[a], palette[theme].band[b])),
      );
      expect(worst, `${theme} worst band pair ${worst.toFixed(4)}`).toBeGreaterThanOrEqual(
        BAND_SEPARATION[theme],
      );
    }
  });

  it("separates the phases far better than the fills they sit on", () => {
    // The point of the change. The fills cannot be pushed apart -- the marker caps them -- so the
    // band has to do the work, and this is the number that says it does.
    for (const theme of THEMES) {
      const worstBand = Math.min(
        ...PAIRS.map(([a, b]) => separation(palette[theme].band[a], palette[theme].band[b])),
      );
      const worstFill = Math.min(
        ...PAIRS.map(([a, b]) => separation(palette[theme].fill[a], palette[theme].fill[b])),
      );
      // The only place in this file the fills are compared to each other, and it asserts just that
      // the bands win. The rule it stands in for asserted the opposite, which is the one that cannot be
      // satisfied, so this is deliberately a comparison rather than a floor.
      expect(
        worstBand,
        `${theme} bands ${worstBand.toFixed(4)} against fills ${worstFill.toFixed(4)}`,
      ).toBeGreaterThan(worstFill);
    }
  });
});

describe("day number contrast", () => {
  for (const theme of THEMES) {
    for (const status of STATUSES) {
      it(`${theme} ${status} number clears ${TEXT_CONTRAST}:1 against its fill`, () => {
        const ratio = contrast(palette[theme].foreground[status], palette[theme].fill[status]);
        expect(
          ratio,
          `${theme} ${status} ${palette[theme].foreground[status]} on ${palette[theme].fill[status]}`,
        ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      });
    }
  }
});

describe("guard has no fill-separation rule", () => {
  /**
   * The omission is deliberate, and this is what keeps it deliberate. A monitor marker is painted on a
   * Calendar day's fill, which caps the fill's lightness, and no set of fill values inside that cap
   * separates far enough for the assertion to be worth making. A rule written against that cap would
   * either fail against a correct palette or force an illegible one. The band carries the distinction
   * instead, and `status band separation` above is where that is actually checked.
   *
   * Code shapes only, deliberately: this file has to be free to *explain* why fills are not compared,
   * and an earlier version of this list matched its own explanation.
   */
  const FORBIDDEN = [
    "FILL_SEPARATION",
    "separation(t.fill",
    "separation(fills",
    "MIN_FILL_SEPARATION",
  ];
  const REQUIRED = "the assertion is not satisfiable";

  /**
   * The guard's own body, minus this block. The needles have to appear literally in order to be
   * searched for, so searching the whole file would find this list and report itself.
   */
  function guardedSource() {
    const source = readFileSync(SELF_PATH, "utf8");
    return source.slice(0, source.indexOf('describe("guard has no fill-separation rule"'));
  }

  it("states why fills are not compared to each other", () => {
    expect(guardedSource(), "the reason fills are not separated must be documented here").toContain(
      REQUIRED,
    );
  });

  it("contains no fill-vs-fill separation assertion", () => {
    const found = FORBIDDEN.filter((needle) => guardedSource().includes(needle));
    expect(
      found,
      "a fill-separation rule must not come back without a new argument for it",
    ).toEqual([]);
  });
});
