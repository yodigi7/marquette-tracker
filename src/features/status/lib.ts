import type { DayStatus, EngineWarning, FertileWindow, Forecast } from "@/core/engine/types";
import { FERTILITY_STATUS_VISUALS } from "@/lib/fertility-visuals";
import { dayInCycle, dateKeyLocal, parseDateKey, todayKey } from "@/core/dateKeys";

export { dayInCycle, dateKeyLocal, parseDateKey, todayKey };

// The Calendar's phase vocabulary, so both surfaces name a status the same way.
// No label asserts safety: a day status is derived from the window and the cycle
// day alone, so a day holding a monitor `high` can still resolve post-window.
export const STATUS_LABELS: Record<DayStatus, string> = {
  "pre-fertile": "Before",
  fertile: "Fertile",
  "post-peak": "After (post-peak)",
  "post-calendar": "After (by calendar)",
};

export const STATUS_TONES: Record<DayStatus, string> = {
  "pre-fertile": FERTILITY_STATUS_VISUALS["pre-fertile"].badge,
  fertile: FERTILITY_STATUS_VISUALS.fertile.badge,
  "post-peak": FERTILITY_STATUS_VISUALS["post-peak"].badge,
  "post-calendar": FERTILITY_STATUS_VISUALS["post-calendar"].badge,
};

export const BEGIN_RULE_LABELS: Record<FertileWindow["beginRule"], string> = {
  "calendar-day-6": "calendar rule (cycle day 6)",
  "calendar-day-6-fallback": "calendar rule (cycle day 6) — no Peak history to measure from",
  "calendar-earliest-peak-minus-6": "earliest Peak − 6 days",
  "first-high-or-peak": "first High or Peak reading",
};

/**
 * One label per end rule, and each names the rule it stands for rather than a synonym of another:
 * the two that measure from a Peak differ in *whose* Peak, and the fallback names its composition.
 * The post-Peak interval is a protocol constant, so a label that carries a day count states it.
 */
export const END_RULE_LABELS: Record<FertileWindow["endRule"], string> = {
  "current-peak-plus-n": "this cycle's monitor Peak + 3 days",
  "lookback-latest-peak-plus-n": "latest Peak of your recent cycles + 3 days",
  "protocol-fallback-window": "protocol default: earliest possible Peak + 3 days",
  none: "no end (no Peak yet)",
};

/** The post-Peak interval is a protocol constant, so the rule text carries the value. */
export function endRuleLabel(rule: FertileWindow["endRule"]): string {
  return END_RULE_LABELS[rule];
}

/**
 * Heading for each protocol warning this view reports. Each describes the user's own recorded
 * readings and what the computed window said — never error, invalid, or malfunction language, and
 * never a disclaimer. The cycle-scoped kinds are declared by `Extract` rather than as a full
 * `Record<WarningKind, string>` so a new engine warning cannot reach this view by accident: it has
 * to be added here, with wording, before it can be shown.
 */
export const WARNING_LABELS: Record<
  Extract<
    EngineWarning["kind"],
    "monitor-evidence-outside-window" | "open-cycle-past-window-end" | "no-peak-end" | "high-run"
  >,
  string
> = {
  "monitor-evidence-outside-window": "Monitor reading outside the computed window",
  "open-cycle-past-window-end": "Cycle still in progress",
  "no-peak-end": "No monitor Peak reading for this cycle",
  "high-run": "A long run of High readings",
};

/**
 * Text for the protocol warnings on a cycle that most affect the selected date, or null when it has
 * none.
 *
 * The cycle day is named explicitly because the warning belongs to the cycle while this view is
 * date-selectable: someone looking at cycle day 8 still needs to learn their day-15 reading
 * conflicts. `windowEnd` comes from the caller rather than the warning, because the engine
 * deliberately reports only the cycle and the day — the window is the caller's to look up.
 *
 * Precedence, sharpest first: evidence outranks still-in-progress, because it is the sharper
 * contradiction, and both outrank the two observations, which report a fact about the readings
 * without contradicting anything the model concluded.
 *
 * The two observations are orthogonal rather than competing, so a cycle carrying both is given both
 * sentences. A long run of Highs is the most common reason a cycle has no Peak to measure an end
 * from, and dropping either half would leave the other unexplained — a peakless cycle whose High run
 * is the reason would otherwise report an absence and hide its cause.
 *
 * The `high-run` copy states the run's length and the monitor's own guidance, and nothing about the
 * user's body: the run is an observation, not a diagnosis. The `no-peak-end` copy says the cycle is
 * unresolved rather than implying a fault.
 */
export function warningBanner(warnings: EngineWarning[], windowEnd: number | null): string | null {
  const evidence = warnings.find((w) => w.kind === "monitor-evidence-outside-window");
  if (evidence && evidence.kind === "monitor-evidence-outside-window") {
    const end = windowEnd === null ? "an undetermined day" : `day ${windowEnd}`;
    return `${WARNING_LABELS[evidence.kind]}. Your monitor shows High or Peak on cycle day ${evidence.day}, but the computed window ended on ${end}. The window has not changed.`;
  }

  const inProgress = warnings.find((w) => w.kind === "open-cycle-past-window-end");
  if (inProgress) {
    const end = windowEnd === null ? "an undetermined day" : `day ${windowEnd}`;
    return `${WARNING_LABELS["open-cycle-past-window-end"]}. The computed window ended on ${end}, and this cycle has not closed yet.`;
  }

  const observations: string[] = [];

  const noPeak = warnings.find((w) => w.kind === "no-peak-end");
  if (noPeak) {
    observations.push(
      `${WARNING_LABELS["no-peak-end"]}. The protocol ends the fertile window three full days after a monitor Peak reading, and this cycle has no monitor Peak reading to measure that end from. Every day from the start of the window onward is treated as fertile, and the cycle is unresolved rather than settled.`,
    );
  }

  const run = warnings.find((w) => w.kind === "high-run");
  if (run && run.kind === "high-run") {
    observations.push(
      `${WARNING_LABELS["high-run"]}. Your monitor has read High on ${run.run} consecutive cycle days, which is the point at which its guidance is to stop testing for a Peak. No Peak has been inferred from these readings.`,
    );
  }

  return observations.length > 0 ? observations.join(" ") : null;
}

export function windowDescription(window: FertileWindow, peakKnown: boolean): string {
  const begin = `Fertile from cycle day ${window.begin} (${BEGIN_RULE_LABELS[window.beginRule]})`;
  if (window.end === null) {
    return peakKnown
      ? `${begin}; end pending new readings after Peak.`
      : `${begin}; end unknown until a Peak is read.`;
  }
  return `${begin}; until day ${window.end} (${endRuleLabel(window.endRule)}).`;
}

/** The cycle and selection a Peak count is reported against. */
export interface PeakCountInput {
  /** The cycle's anchoring monitor Peak day, or null when none is logged. */
  peakDay: number | null;
  /** The selected date's cycle day. */
  cycleDay: number;
  /** Today's cycle day. A count may not speak about days beyond it. */
  todayCycleDay: number;
  /** Monitor Peak readings logged in this cycle. */
  peaks: number;
}

/**
 * Where the selected cycle day sits relative to the cycle's Peak reading.
 *
 * A retrospective count and nothing more. `peakDay` is the same reading the window end is measured
 * from, so the two cannot disagree; and both terms are cycle days off the same Day 1, so a day the
 * user did not log cannot move the number. A date earlier than the Peak has a negative difference,
 * and every way of rendering that is a countdown, so it names the day instead.
 *
 * The Status view's picker has no future cut-off, so a date that has not happened yet can be
 * selected. Counting to it would assert that days have elapsed which have not — the same class of
 * overclaim as presenting the rest of an in-progress cycle as settled, which the engine already
 * reports as a warning. So a future date names the Peak's day and counts nothing.
 *
 * `peaks` is how many monitor Peak readings the cycle holds. A cycle can hold more than one, and a
 * count that does not say so reads as though it could only hold one. The clause states which reading
 * was used and how many exist, and deliberately does not claim which one set the window end: after
 * six cycles the historical rule can finish the window before the current one does.
 */
export function peakCountLine({ peakDay, cycleDay, todayCycleDay, peaks }: PeakCountInput): string {
  if (peakDay === null) {
    return "No Peak reading logged for this cycle yet.";
  }
  // Checked before the elapsed arithmetic: a Peak can only ever be logged on a day that has
  // happened, so a future date is always ahead of it and would otherwise land in the count branch.
  const future = cycleDay > todayCycleDay;
  const elapsed = cycleDay - peakDay;
  const base = future
    ? `Your Peak reading is on cycle day ${peakDay} — this date has not happened yet.`
    : elapsed === 0
      ? `Your Peak reading is on cycle day ${peakDay} — the same day.`
      : elapsed < 0
        ? `Your Peak reading is on cycle day ${peakDay} — this date is before it.`
        : `${elapsed} ${elapsed === 1 ? "day" : "days"} since your Peak reading on cycle day ${peakDay}.`;
  return peaks > 1 ? `${base} Last of ${peaks} Peak readings this cycle.` : base;
}

/**
 * The expected Peak-day range, labelled as coming from past cycles.
 *
 * Reports the monitor Peak days inside the configured history window, which is the range the app's
 * own calendar rule derived the current cycle's window from. A retrospective statement about history,
 * not a forecast: it is always a range, never a day, and it carries no source cue. Returns null when
 * there is nothing to derive, so the caller renders no line at all rather than an empty one.
 */
export function expectedPeakRangeLine(forecast: Forecast | null): string | null {
  const range = forecast?.peakDayRangeInWindow;
  if (!forecast || range === null || range === undefined) {
    return null;
  }
  const cycles = forecast.lookbackWindow;
  const span =
    range.earliest === range.latest
      ? `cycle day ${range.earliest}`
      : `cycle day ${range.earliest} to ${range.latest}`;
  const basis = `Based on your last ${cycles} completed cycle${cycles === 1 ? "" : "s"}, your expected Peak day is ${span}.`;
  // The window is `cycles` wide but only the cycles carrying a Peak contribute, so say so rather than
  // letting the range imply more evidence than it rests on.
  const coverage =
    range.cycles < cycles ? ` ${range.cycles} of those cycles have a Peak reading.` : "";
  return `${basis}${coverage}`;
}
