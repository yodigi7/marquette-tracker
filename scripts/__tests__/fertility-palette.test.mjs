import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The palette guard for the fertility visuals.
 *
 * A **fill** is the large background of a Calendar day, and a monitor marker is painted on top of it.
 * That caps how light a fill may be: in the dark theme the cap is 0.0435 relative luminance, set by the
 * **Low** reading, and every fill has to sit under it. The consequence is that fills cannot be the thing
 * that tells two phases apart -- all three sit within 0.017 OKLab lightness of one another, and a search
 * for a better-separated trio inside the cap does not find one worth having.
 *
 * The **window** is the exception, and it is not a fill. It spans the whole day, so it is a surface like a
 * fill and is held to the same marker rule; it is allowed to be brighter because it is the one mark on the
 * calendar that has to be found at a glance, and the cell behind it is painted in the same colour so a
 * rounded end cannot reveal anything else through its own corner. The two quiet phases are plain tints.
 *
 * That is why this file asserts the window is distinguishable and deliberately does not assert the fills
 * are mutually distinguishable: that assertion is not satisfiable inside the marker cap, and the check at
 * the foot of this file fails if one is added back without a new argument for it. A large filled area is
 * also not a 3:1 non-text case -- that rule is about boundaries and indicator shapes, and no fill in
 * either theme meets it against its page -- so the window is checked by colour distance instead.
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
const TEXT_CONTRAST = 4.5;

/**
 * The one surface where the marker floor is knowingly not met, and why.
 *
 * There is no such surface at present, and the declaration below is empty for that reason. It is kept
 * because the arrangement it was written for is easy to fall back into, and a guard that cannot express
 * "this one is excepted" is a guard whose author will lower the floor instead.
 *
 * The history, because the reasoning is not obvious. A fill was capped at `0.0435` luminance because the
 * Low reading, the darkest of the three, would drop under 3:1 against anything brighter, and a run of
 * review rounds pushed the dark `Before` fill past that cap anyway -- at the product owner's direction,
 * against the explanation, with the shortfall recorded in a named exception rather than by weakening
 * `MARKER_CONTRAST` for everything.
 *
 * The way out was not available in the fill. The floor is a property of the *pair*: it had only ever been
 * solved for the background, and the background was pinned by the marker rather than the marker by the
 * background. Lightening the Low reading to teal-400 raised what the floor permits a fill to be, so the
 * Before fill could stay light *and* the reading on it could clear 3:1 honestly. The exception is
 * therefore gone rather than widened, and `MARKER_CONTRAST` is back to being the rule everywhere.
 *
 * To reinstate one, name a theme, the status, and the ratio it is held to, e.g.
 * `{ theme: "dark", status: "pre", ratio: 1.5 }`. The rule that consumes it checks that it still covers
 * exactly the one surface-and-reading pair, so it cannot quietly become a loophole.
 */
const MARKER_CONTRAST_SET_ASIDE = null;

/**
 * Minimum OKLab distance between any two things drawn at marker size.
 *
 * `MARKER_SEPARATION` covers the three monitor readings at 10px. Low/Peak was the reported bug at 0.198
 * (light) and 0.158 (dark); every pair now clears 0.25. It is also the reason the fills cannot simply
 * be lightened: lifting all three readings to a comparable brightness raises the fill cap by 1.6x but
 * drops their own separation to 0.197, so lightening the readings to free the fills would mean
 * relaxing this floor. Two accessibility rules in direct conflict, and this one should not give.
 */
const MARKER_SEPARATION = 0.25;

/**
 * The one reading pair knowingly under that floor, and why.
 *
 * Peak at OKLab L 0.80 is what the product owner chose after being shown the sweep, and it sits 0.231
 * from High. The rule is bent for that one pair by name rather than by lowering `MARKER_SEPARATION`,
 * which would weaken the check for all three pairs in both themes. The pair is asserted individually at
 * the floor this sets, so a *further* regression on it still fails.
 *
 * Worth recording that this floor is not a reliable proxy for legibility, because it is what it disagreed
 * with. OKLab distance sums hue and lightness into one figure, so a pair backed only by hue scores the
 * same as one backed by lightness, and at 6px those are not the same thing. The readings are now spread on
 * lightness -- 0.31, 0.44 and 0.47 luminance -- which is the part that reads, and this exception is a
 * single pair inside that spread rather than a symptom of it.
 */
const SEPARATION_SET_ASIDE = { theme: "dark", pair: ["high", "peak"], ratio: 0.2 };

/**
 * Minimum OKLab distance between the window's bar and the surfaces it has to be told from.
 *
 * A floor, not a contrast ratio, because the bar is a large filled area and 3:1 is a rule about
 * boundaries and indicator shapes. Dark reaches 0.108 against the Before fill, the tightest neighbour
 * it has, and light 0.104 against the same. Both clear 0.1 with little room, which is the honest state
 * of a palette whose fills are all capped near the page.
 */
const BAR_SEPARATION = { light: 0.1, dark: 0.1 };

/**
 * Minimum OKLab distance between a Calendar phase fill and the surface behind the cell.
 *
 * The rule a review asked for and the palette did not have. A large filled area does not need 3:1 against
 * its surface -- nothing in this palette manages that -- but a fill that sits almost on the surface is
 * invisible, and that is a reportable failure rather than a matter of taste.
 *
 * The Calendar renders on the card, not the page, and the card is the lighter of the two, so the card is
 * the binding surface: the fills that shipped clear 0.151 and 0.125 against it where the ones before
 * them managed 0.105 and 0.075. The dark floor of 0.11 fails both of those, which is the point.
 */
const FILL_VISIBILITY = { light: 0.05, dark: 0.11 };

/** Brace-matched body of a top-level rule, so `.dark` is read whole and not line by line. */
function extractBlock(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`could not find "${selector} {" in index.css`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return stripComments(css.slice(start, i + 1));
    }
  }
  throw new Error(`unterminated "${selector} {" block in index.css`);
}

/**
 * Removes comments, because a token inside one is not a token.
 *
 * This is not tidiness. A CSS block comment that is never closed swallows every declaration after it,
 * which deletes a whole theme's tokens; a regex match on the raw text still finds them inside the
 * comment, so the palette guard reports a clean pass for colours the app no longer paints. That is
 * exactly what happened: the dark `Before` fill and three fertile tokens were commented out for an
 * entire review cycle and every assertion here stayed green. Comments are stripped before anything is
 * read, so a token that is not live is now a hard error instead of a silent pass.
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
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
      foreground: {},
      surfaces: { base: readColour(block, "background"), card: readColour(block, "card") },
      predicted: readColour(block, "fertility-forecast-bg"),
      // Only the fertile phase is drawn as a bar, so it is the only one that has the token. Reading it
      // for every status would assert a bar on Before and After that the Calendar deliberately does
      // not draw. It is also the colour of the day cell behind the bar, which is what stops a rounded
      // end from revealing the status tint through its own corner.
      bar: readColour(block, "fertility-status-fertile-window"),
    };
    for (const reading of READINGS) {
      entry.markers[reading] = readColour(block, `fertility-monitor-${reading}`);
    }
    for (const status of STATUSES) {
      entry.fill[status] = readColour(block, `fertility-status-${status}-bg`);
      entry.foreground[status] = readColour(block, `fertility-status-${status}-fg`);
    }
    palette[theme] = entry;
  }
  return palette;
}

const palette = readPalette();

describe("the stylesheet the palette is read from", () => {
  it("has no unterminated comment", () => {
    // A comment that never closes silently deletes every declaration after it. It is invisible in review
    // and it is invisible to the rules below, so it is checked here on its own terms.
    const css = readFileSync(CSS_PATH, "utf8");
    const opens = (css.match(/\/\*/g) ?? []).length;
    const closes = (css.match(/\*\//g) ?? []).length;
    expect(
      { opens, closes },
      "index.css has a comment that is never closed, which comments out the tokens after it",
    ).toEqual({ opens, closes: opens });
  });

  it("defines every Calendar colour in both themes, outside any comment", () => {
    // `readPalette` throws on a token it cannot find, so reaching this point means each one resolved.
    // Asserting it explicitly names the guarantee: a colour the app paints is a live declaration.
    const css = stripComments(readFileSync(CSS_PATH, "utf8"));
    for (const theme of THEMES) {
      const names = [
        ...READINGS.map((r) => `fertility-monitor-${r}`),
        ...STATUSES.flatMap((s) => [`fertility-status-${s}-bg`, `fertility-status-${s}-fg`]),
        "fertility-status-fertile-window",
        "fertility-forecast-bg",
      ];
      const missing = names.filter((n) => !new RegExp(`--${n}:`).test(css));
      expect(missing, `${theme} tokens missing from index.css`).toEqual([]);
    }
  });
});

/**
 * Every surface a Calendar reading marker can be painted on, in the given theme.
 *
 * The window's bar is in this set and is not optional to it: the bar covers the whole cell, so a reading
 * on a window day sits on the bar and not on the cell's own tint. Leaving it out would let the bar be
 * brightened past what a reading can survive, which is the mistake the bar is most likely to invite --
 * it is the one mark on the calendar whose whole job is to be loud.
 */
/**
 * Which readings can actually be painted on each surface a Calendar day can present.
 *
 * This is not a convenience list. A day is `pre-fertile` exactly when it falls before the window's
 * begin, and the begin is `min(first High-or-Peak day, the calendar begin)` -- so it is never *after*
 * the first High or Peak reading, and every pre-fertile day is strictly before one. A pre-fertile day
 * therefore carries a Low reading or none, never a High or a Peak.
 *
 * `marquette.test.ts` asserts that against the engine, sweeping High and Peak across a whole cycle, so
 * this list is a consequence that is checked rather than one that is assumed. It matters because checking
 * the full cross product is how a palette ends up held to combinations that cannot occur, and how a real
 * exception gets lost among them.
 */
const READINGS_ON = {
  pre: ["low"],
  fertile: ["low", "high", "peak"],
  "post-peak": ["low", "high", "peak"],
  "post-calendar": ["low", "high", "peak"],
  // A day with no phase, and the page or card behind it. A projected day is in the future and holds no
  // reading, but a day outside every cycle can carry one, so all three are held here.
  base: ["low", "high", "peak"],
  card: ["low", "high", "peak"],
  bar: ["low", "high", "peak"],
  predicted: ["low", "high", "peak"],
};

/**
 * The separation floor that applies to one reading pair in one theme: the real one, or the set-aside ratio
 * if this is the pair `SEPARATION_SET_ASIDE` names. Applied here rather than by lowering the floor, so every
 * other pair in both themes is still held to `MARKER_SEPARATION`.
 */
function exceptedPair(theme, a, b) {
  const e = SEPARATION_SET_ASIDE;
  if (e && theme === e.theme && e.pair[0] === a && e.pair[1] === b) return e.ratio;
  return MARKER_SEPARATION;
}

function cellFills(theme) {
  const t = palette[theme];
  return {
    base: t.surfaces.base,
    card: t.surfaces.card,
    ...t.fill,
    bar: t.bar,
    predicted: t.predicted,
  };
}

/** OKLab lightness, which is what "loud" means perceptually. Relative luminance is not it. */
function lightness(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return (
    0.2104542553 * Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) +
    0.793617785 * Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) -
    0.0040720468 * Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  );
}

describe("palette is read from the stylesheet the app loads", () => {
  it("resolves the theme surfaces from oklch, not from a guessed hex", () => {
    expect(palette.light.surfaces.base).toBe("#ffffff");
    expect(palette.dark.surfaces.base).toBe("#0a0a0a");
  });

  it("finds a distinct hex for every fill and foreground it guards", () => {
    for (const theme of THEMES) {
      for (const status of STATUSES) {
        for (const [part, values] of Object.entries({
          fill: palette[theme].fill,
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
      it(`${theme} ${reading} clears the floor against every surface it can land on`, () => {
        const hex = palette[theme].markers[reading];
        // The exception, when there is one, applies to a single surface in a single theme. It is applied
        // here rather than by weakening the floor, so every other surface is still held to 3:1.
        const floor =
          MARKER_CONTRAST_SET_ASIDE && theme === MARKER_CONTRAST_SET_ASIDE.theme
            ? MARKER_CONTRAST_SET_ASIDE.ratio
            : MARKER_CONTRAST;
        const failures = Object.entries(cellFills(theme))
          // Only the readings that can land on this surface at all. Checking the full cross product would
          // hold the palette to combinations the engine cannot produce, and would bury a genuinely
          // excepted combination among impossible ones.
          .filter(([name]) => READINGS_ON[name]?.includes(reading))
          .map(([name, fill]) => [name, contrast(hex, fill)])
          .filter(([, ratio]) => ratio < floor)
          .map(([name, ratio]) => `${name} ${ratio.toFixed(2)}:1`);

        expect(failures, `${theme} ${reading} is ${hex}`).toEqual([]);
      });
    }
  }

  it("leaves no surface under the floor, or excepts exactly one and names it", () => {
    // The guard against an exception becoming a loophole. Whatever is under 3:1 has to be precisely what
    // `MARKER_CONTRAST_SET_ASIDE` names -- one surface, and because `pre` can only ever carry a Low
    // reading, one surface-and-reading pair -- and nothing else may join it. With no exception declared
    // the list has to be empty, which is the state the palette is in now.
    const themes = MARKER_CONTRAST_SET_ASIDE
      ? [
          MARKER_CONTRAST_SET_ASIDE.theme,
          ...THEMES.filter((t) => t !== MARKER_CONTRAST_SET_ASIDE.theme),
        ]
      : THEMES;
    const below = themes
      .flatMap((theme) =>
        Object.entries(cellFills(theme)).flatMap(([name, fill]) =>
          (READINGS_ON[name] ?? []).map(
            (reading) =>
              `${theme}/${name}/${reading} ` +
              `${contrast(palette[theme].markers[reading], fill).toFixed(2)}:1`,
          ),
        ),
      )
      .filter((entry) => Number.parseFloat(entry.split(" ").at(-1)) < MARKER_CONTRAST);

    if (!MARKER_CONTRAST_SET_ASIDE) {
      expect(
        below,
        "nothing may sit under the marker floor; if one surface genuinely has to, declare it in " +
          "MARKER_CONTRAST_SET_ASIDE rather than lowering the floor",
      ).toEqual([]);
      return;
    }
    expect(
      below,
      `only ${MARKER_CONTRAST_SET_ASIDE.status} in ${MARKER_CONTRAST_SET_ASIDE.theme} may sit under ` +
        "the floor, and only while the cap is knowingly set aside for it",
    ).toEqual([
      `${MARKER_CONTRAST_SET_ASIDE.theme}/${MARKER_CONTRAST_SET_ASIDE.status}/low ` +
        `${contrast(
          palette[MARKER_CONTRAST_SET_ASIDE.theme].markers.low,
          palette[MARKER_CONTRAST_SET_ASIDE.theme].fill[MARKER_CONTRAST_SET_ASIDE.status],
        ).toFixed(2)}:1`,
    ]);
  });
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
        const floor = exceptedPair(theme, a, b);
        const distance = separation(palette[theme].markers[a], palette[theme].markers[b]);
        expect(
          distance,
          `${theme} ${a}/${b} separation is ${distance.toFixed(4)}` +
            (floor < MARKER_SEPARATION ? `, against the set-aside floor of ${floor}` : ""),
        ).toBeGreaterThanOrEqual(floor);
      });
    }
  }

  it("bends the separation floor for one named pair and no other", () => {
    // The guard against an exception becoming a loophole. Anything under the real floor has to be exactly
    // the pair `SEPARATION_SET_ASIDE` names, in the theme it names.
    const themes = [
      SEPARATION_SET_ASIDE.theme,
      ...THEMES.filter((t) => t !== SEPARATION_SET_ASIDE.theme),
    ];
    const below = themes.flatMap((theme) =>
      PAIRS.map(([a, b]) => {
        const distance = separation(palette[theme].markers[a], palette[theme].markers[b]);
        return distance < MARKER_SEPARATION ? `${theme}/${a}-${b} ${distance.toFixed(4)}` : null;
      }),
    );
    expect(
      below.filter(Boolean),
      `only ${SEPARATION_SET_ASIDE.pair.join("-")} in ${SEPARATION_SET_ASIDE.theme} may sit under the ` +
        "separation floor, and only while Peak is held at the lightness that was chosen",
    ).toEqual([
      `${SEPARATION_SET_ASIDE.theme}/${SEPARATION_SET_ASIDE.pair.join("-")} ${separation(
        palette[SEPARATION_SET_ASIDE.theme].markers[SEPARATION_SET_ASIDE.pair[0]],
        palette[SEPARATION_SET_ASIDE.theme].markers[SEPARATION_SET_ASIDE.pair[1]],
      ).toFixed(4)}`,
    ]);
  });
});

describe("the phase fills are visible against the page", () => {
  /**
   * The reported failure: in dark mode the two quiet phases were almost indistinguishable from the
   * background behind them. Nothing in the guard would have caught it, because every other rule here is
   * about a fill against a *marker* or against its *own* phase, and none of them is about a fill against
   * the page it sits on.
   */
  for (const theme of THEMES) {
    for (const phase of ["pre", "post-peak"]) {
      it(`${theme} ${phase} fill is a visible area, not a tint the card swallows`, () => {
        const floor = FILL_VISIBILITY[theme];
        for (const [name, surface] of Object.entries(palette[theme].surfaces)) {
          const distance = separation(palette[theme].fill[phase], surface);
          expect(
            distance,
            `${theme} ${phase} ${palette[theme].fill[phase]} against ${name} ${surface}`,
          ).toBeGreaterThanOrEqual(floor);
        }
      });

      it(`${theme} the window is a more prominent surface than ${phase}`, () => {
        // Stated as distance from the surface rather than as lightness, because "loud" means different
        // things in the two themes: in dark the window is the lightest thing on the calendar, in light it
        // is the darkest. Comparing lightness across themes gets one of the two exactly backwards, which
        // is what an earlier draft of this rule did.
        //
        // This one is not relaxed, and holding it is part of what fixing the Low reading bought. When the
        // Before fill was pushed past the marker cap, it ended up further from the card than the window
        // was -- so Before out-shouted the window, and this rule had to be excepted too. Lightening the
        // Low dot let the fill stay light without out-shouting anything, so the exception is gone and the
        // window is the most prominent surface on the calendar again.
        const setAside =
          MARKER_CONTRAST_SET_ASIDE && theme === MARKER_CONTRAST_SET_ASIDE.theme && phase === "pre";
        const surface = palette[theme].surfaces.card;
        const windowDistance = separation(palette[theme].bar, surface);
        const phaseDistance = separation(palette[theme].fill[phase], surface);
        expect(
          phaseDistance,
          `${theme} the window is ${windowDistance.toFixed(4)} from ${surface} and the ${phase} fill is ` +
            `${phaseDistance.toFixed(4)}` +
            (setAside ? ", which is the known consequence of the cap being set aside" : ""),
        ).toBeLessThan(setAside ? Infinity : windowDistance);
      });
    }
  }
});

describe("the window's bar", () => {
  /**
   * The bar is the window's own surface. Unlike the outline it replaced, it is painted *under* the
   * reading markers, so it is held to the same 3:1 as any other fill -- the rule above already covers
   * it. What it has to earn on top of that is the shape: it is the only solid surface on a Calendar
   * month, so it has to be plainly visible against the page and clearly the window's own, and it has to
   * be far enough from the page and the two quiet phase fills that it reads as its own shape.
   *
   * The values that reach those bars are worth recording, because they are the whole reason the bar
   * exists. In dark, the binding reading is LOW, which permits a fill up to 0.0435 luminance -- not the
   * Peak, which permits 0.0922. The cell tint is a 0.106 step above the page; the bar is 0.209, which is
   * the difference between a bar that reads as a surface and a dark block with a wire around it.
   */
  for (const theme of THEMES) {
    it(`${theme} window bar is a large area of its own colour, not a boundary to be found`, () => {
      // This is a separation check, deliberately not a 3:1 contrast check, and the difference matters.
      // WCAG's 3:1 non-text rule covers boundaries needed to identify a control and indicator shapes; a
      // large filled area is not one, and no fill in this palette reaches 3:1 against its page -- the
      // phase tints sit at 1.1:1 and 1.3:1. Writing the contrast rule here would be a rule that fails a
      // correct palette. What the bar actually needs is to be told from the page behind it and from the
      // two fills it sits beside, and the instrument for that is OKLab distance.
      for (const [name, surface] of Object.entries(palette[theme].surfaces)) {
        const distance = separation(palette[theme].bar, surface);
        expect(
          distance,
          `${theme} bar ${palette[theme].bar} against ${name} ${surface}`,
        ).toBeGreaterThanOrEqual(BAR_SEPARATION[theme]);
      }
      for (const phase of ["pre", "post-peak"]) {
        const distance = separation(palette[theme].bar, palette[theme].fill[phase]);
        expect(
          distance,
          `${theme} bar against the ${phase} fill it sits beside`,
        ).toBeGreaterThanOrEqual(BAR_SEPARATION[theme]);
      }
    });

    it(`${theme} window colour is no darker than the status tint it replaces on the Calendar`, () => {
      // A rounded corner cannot paint itself: whatever is behind the bar's radius shows through the arc.
      // With the status tint behind it, each end of the window grew a notch of that tint. The Calendar
      // therefore paints a window day in the window's own colour.
      //
      // This is a one-directional lightness rule, not a separation floor, and deliberately so: the two
      // are never on screen together -- they are the same surface on the Calendar and the tint is the
      // Status view's. Demanding a distance between them would be asserting a distinction no user ever
      // sees, and in dark the honest distance is only 0.088. What actually has to hold is that the window
      // is not the darker of the two, because a full-height shape at the tint's lightness is not a
      // surface. In light the tint is already the loudest thing on a white page and the two are the same
      // value by design.
      expect(
        lightness(palette[theme].bar),
        `${theme} window ${palette[theme].bar} is darker than the tint ${palette[theme].fill.fertile}`,
      ).toBeGreaterThanOrEqual(lightness(palette[theme].fill.fertile));
    });
  }

  it.each(THEMES)("%s window bar survives its worst reading", (theme) => {
    // Stated in its own right rather than left to the marker rule above, because the bar is the one
    // surface on the calendar whose purpose is to be loud: the numbers here are what stop "make the
    // window more obvious" from silently costing a reading its legibility.
    const worst = Math.min(
      ...READINGS.map((reading) => contrast(palette[theme].markers[reading], palette[theme].bar)),
    );
    expect(
      worst,
      `${theme} worst reading against the bar is ${worst.toFixed(2)}:1, and the binding reading is ` +
        `${READINGS.reduce((a, b) =>
          contrast(palette[theme].markers[b], palette[theme].bar) <
          contrast(palette[theme].markers[a], palette[theme].bar)
            ? b
            : a,
        )}`,
    ).toBeGreaterThanOrEqual(MARKER_CONTRAST);
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

    // A Calendar window day is painted in the window's own colour, not the status tint, so the number on
    // it has to clear the text rule against that. The tint is still the surface everywhere else, which is
    // why both are checked rather than one replacing the other.
    it(`${theme} fertile number clears ${TEXT_CONTRAST}:1 against the window it sits on`, () => {
      const ratio = contrast(palette[theme].foreground.fertile, palette[theme].bar);
      expect(
        ratio,
        `${theme} fertile number ${palette[theme].foreground.fertile} on the window ${palette[theme].bar}`,
      ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    });
  }
});

describe("guard has no fill-separation rule", () => {
  /**
   * The omission is deliberate, and this is what keeps it deliberate. A monitor marker is painted on a
   * Calendar day's fill, which caps the fill's lightness, and no set of fill values inside that cap
   * separates far enough for the assertion to be worth making. A rule written against that cap would
   * either fail against a correct palette or force an illegible one. The window carries the distinction
   * instead, and the bar rules above are where that is actually checked.
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
  const REQUIRED = "that assertion is not satisfiable inside the marker cap";

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
