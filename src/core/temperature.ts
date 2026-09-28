/**
 * Basal body temperature rules.
 *
 * Deliberately outside `core/engine`: the Marquette contract is monitor-only and
 * temperature is a logged overlay that is never engine evidence. This module
 * imports nothing at all, so the day-entry form, the cycle chart, and backup
 * import all consume the same numbers rather than three copies of the range.
 */

/** The unit the user enters and reads temperatures in. */
export type TemperatureUnit = "c" | "f";

/**
 * Celsius is canonical in storage. It is the finer of the two scales — 0.01 °C
 * against 0.1 °F, which is 0.056 °C — so storing at the finer resolution never
 * quantises a coarser measurement, while storing in Fahrenheit would
 * permanently round every Celsius reading onto a coarser grid. It is also the
 * unit every value already on disk is in, so no record is ever rewritten.
 */
export const canonicalUnit: TemperatureUnit = "c";

export interface TemperatureBand {
  min: number;
  max: number;
}

/**
 * A human basal temperature people actually wake up with, plus a fever. Values
 * here save with no ceremony.
 */
export const BBT_USUAL_C: TemperatureBand = { min: 35, max: 38 };

/**
 * Anything a living person could plausibly register: below the usual band
 * (hypothermia) through the top of a high fever. Outside this band the reading
 * is refused. It is deliberately not set at "unusual" — illness and a hot
 * night are real readings, and the confirm tier exists so they can be kept.
 */
export const BBT_PLAUSIBLE_C: TemperatureBand = { min: 34, max: 42 };

/** Headroom either side of the plotted readings so the line never sits on the edge. */
export const BBT_CHART_PAD_C = 0.2;

/** Decimal places each unit is read at. */
const DISPLAY_PRECISION: Record<TemperatureUnit, number> = { c: 2, f: 1 };

export function isTemperatureUnit(value: unknown): value is TemperatureUnit {
  return value === "c" || value === "f";
}

/**
 * A stored value this build does not recognise resolves to the default rather
 * than failing: a display preference must never be the reason the app cannot
 * start, exactly as for the calendar layer ids.
 */
export function normalizeTemperatureUnit(value: unknown): TemperatureUnit {
  return isTemperatureUnit(value) ? value : canonicalUnit;
}

export function unitLabel(unit: TemperatureUnit): string {
  return unit === "f" ? "°F" : "°C";
}

export function convertFromCelsius(celsius: number, unit: TemperatureUnit): number {
  if (unit === "c") {
    return celsius;
  }
  return celsius * (9 / 5) + 32;
}

export function convertToCelsius(value: number, unit: TemperatureUnit): number {
  if (unit === "c") {
    return value;
  }
  return (value - 32) * (5 / 9);
}

/** The same band expressed in the unit the user is working in. */
export function bandIn(centigrade: TemperatureBand, unit: TemperatureUnit): TemperatureBand {
  return {
    min: convertFromCelsius(centigrade.min, unit),
    max: convertFromCelsius(centigrade.max, unit),
  };
}

function within(value: number, band: TemperatureBand): boolean {
  return value >= band.min && value <= band.max;
}

function otherUnit(unit: TemperatureUnit): TemperatureUnit {
  return unit === "c" ? "f" : "c";
}

/** Trims trailing zeros so a whole number reads as "36", not "36.00". */
function trimFixed(value: number, precision: number): string {
  const fixed = value.toFixed(precision);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

/**
 * Formats at the precision the active unit is read at, with trailing zeros
 * dropped so a whole number reads as "36" rather than "36.00".
 */
export function formatForDisplay(celsius: number, unit: TemperatureUnit): string {
  return trimFixed(convertFromCelsius(celsius, unit), DISPLAY_PRECISION[unit]);
}

/** The usual range as the user reads it, shown next to the entry field. */
export function rangeHint(unit: TemperatureUnit): string {
  const band = bandIn(BBT_USUAL_C, unit);
  const precision = DISPLAY_PRECISION[unit];
  return `Usual range ${trimFixed(band.min, precision)}–${trimFixed(band.max, precision)} ${unitLabel(unit)}`;
}

export type BbtRefusalReason = "not-a-number" | "out-of-range" | "unit-mismatch";

export type BbtValidation =
  | { kind: "ok" }
  | { kind: "confirm"; value: number; message: string }
  | { kind: "refused"; reason: BbtRefusalReason; message: string };

/**
 * Classifies a reading the user typed in `unit`. Three outcomes, in order:
 *
 *   1. inside the plausible band, inside the usual band -> save silently
 *   2. inside the plausible band, outside the usual band -> warn, then save if confirmed
 *   3. outside the plausible band -> refuse
 *
 * A refusal inside step 3 additionally names the other scale when the value is
 * plausible there, which is the fingerprint of a Fahrenheit reading typed into a
 * Celsius field. The two plausible bands do not overlap, so that classification
 * is deterministic.
 */
/**
 * How many stored values a user may want to look at: finite, but outside the
 * band a human body can produce. Used to report on a restored backup without
 * ever rewriting or refusing it — a backup that cannot be restored is worse than
 * a restored reading worth checking.
 */
export function isImplausibleCelsius(celsius: number): boolean {
  return (
    Number.isFinite(celsius) && !(celsius >= BBT_PLAUSIBLE_C.min && celsius <= BBT_PLAUSIBLE_C.max)
  );
}

export function validateBbt(value: number, unit: TemperatureUnit): BbtValidation {
  if (!Number.isFinite(value)) {
    return {
      kind: "refused",
      reason: "not-a-number",
      message: "That is not a number. Enter a temperature, or clear the field.",
    };
  }

  const plausible = bandIn(BBT_PLAUSIBLE_C, unit);
  if (within(value, plausible)) {
    const usual = bandIn(BBT_USUAL_C, unit);
    if (within(value, usual)) {
      return { kind: "ok" };
    }
    return {
      kind: "confirm",
      value,
      message:
        `${formatForDisplay(value, unit)} ${unitLabel(unit)} is outside the usual basal range ` +
        `(${rangeHint(unit).replace("Usual range ", "")}). A fever, a hot night, or travel can ` +
        `shift it, so you can still save it if the reading is real.`,
    };
  }

  const other = otherUnit(unit);
  const otherPlausible = bandIn(BBT_PLAUSIBLE_C, other);
  if (within(value, otherPlausible)) {
    // Show the reading back in the unit the user is actually typing into, which
    // is the number they need in order to correct it.
    const asActive = formatForDisplay(convertToCelsius(value, other), unit);
    return {
      kind: "refused",
      reason: "unit-mismatch",
      message:
        `That looks like a ${unit === "c" ? "Fahrenheit" : "Celsius"} reading. ` +
        `${trimFixed(value, DISPLAY_PRECISION[other])} ${unitLabel(other)} is about ` +
        `${asActive} ${unitLabel(unit)}, and this field is in ${unitLabel(unit)}. ` +
        `Change the temperature unit in Settings, or enter the reading in ${unitLabel(unit)}.`,
    };
  }

  const precision = DISPLAY_PRECISION[unit];
  return {
    kind: "refused",
    reason: "out-of-range",
    message:
      `${trimFixed(value, precision)} ${unitLabel(unit)} is not a temperature a person could have. ` +
      `A basal reading is between ${trimFixed(plausible.min, precision)} and ` +
      `${trimFixed(plausible.max, precision)} ${unitLabel(unit)}. Nothing was saved.`,
  };
}

/** Headroom for the chart domain, expressed in the unit being plotted. */
export function chartPad(unit: TemperatureUnit): number {
  return convertFromCelsius(BBT_CHART_PAD_C, unit) - convertFromCelsius(0, unit);
}
