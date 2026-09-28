import { addDays, diffDays } from "./dateUtils";
import {
  computeCycle,
  DEFAULT_EARLIEST_PEAK,
  DEFAULT_POST_PEAK_DAYS,
  MIN_PEAK_RUN_DAYS,
  statusForCycleDay,
} from "./marquette";
import type { CycleHistory, CycleResult, DateKey, EngineSettings, FertileWindow } from "./types";

/** Minimum eligible samples before the conditioned estimate is trusted. */
const MIN_ELIGIBLE_SAMPLES = 2;

/**
 * Cycle number at which the protocol's calendar rule replaces the cycles-1-6
 * shortcut. A projected cycle always selects the calendar rule: it has no
 * monitor Peak of its own, so no branch that requires one could ever apply.
 */
const CALENDAR_RULE_THRESHOLD = 6;

/** Cycle days before the lookback's earliest Peak at which the window opens. */
const CALENDAR_BEGINS_BEFORE_EARLIEST_PEAK = 6;

/**
 * Window used only when the lookback holds no Peak at all, so the calendar rule
 * has no edges to work from. Mirrors the next-fertile-window fallback; both
 * surfaces must agree on the same protocol default.
 *
 * The end is composed from the protocol's own constants — the earliest possible
 * Peak day plus the post-Peak interval — rather than written as a literal, so it
 * cannot drift away from the rules it stands for. `predict.ts` consumes this same
 * constant, which is what keeps the forecast and the projection from disagreeing.
 */
export const PROTOCOL_DEFAULT_WINDOW_BEGIN = 6;
/**
 * Composed rather than typed. `DEFAULT_EARLIEST_PEAK` is the earliest possible **first** Peak day, and
 * the monitor shows Peak for at least `MIN_PEAK_RUN_DAYS` days, so the earliest possible *last* Peak
 * day is 13 — not 12. Writing the run in keeps the arithmetic visible, so the value cannot drift away
 * from the rules it stands for, and a later reading of the monitor's behaviour moves one constant
 * rather than a literal.
 */
export const PROTOCOL_DEFAULT_WINDOW_END =
  DEFAULT_EARLIEST_PEAK + (MIN_PEAK_RUN_DAYS - 1) + DEFAULT_POST_PEAK_DAYS;

/** Ids for projected cycles are synthetic and must never collide with stored ones. */
const PROJECTED_CYCLE_ID_PREFIX = "projected-";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Projected cycle length, as a whole number of days.
 *
 * The median of the most recent closed cycle lengths is used rather than the
 * mean, because the chain compounds: one atypical cycle would offset every
 * projected date after it.
 *
 * The estimate is conditioned on survival. A cycle that already ended could
 * not still be running, so once the open cycle has reached day `d`, only
 * lengths of at least `d` remain eligible. Without this, a late cycle is
 * projected with a length that has already elapsed and the app renders a
 * period start in the past.
 *
 * Below `MIN_ELIGIBLE_SAMPLES` the conditioning has almost nothing left to
 * work with, so the unconditioned median over the same lookback is used
 * instead. That fallback can understate a very late cycle; the projection
 * clamps the result so the invariant still holds.
 *
 * Returns null when there is no closed cycle to learn from.
 *
 * Pure: no I/O, no framework imports.
 */
export function estimateProjectedLength(
  closedLengths: number[],
  currentCycleDay: number,
  historyWindow: number,
): number | null {
  const recent = closedLengths.slice(-Math.max(1, historyWindow));
  if (recent.length === 0) {
    return null;
  }
  const eligible = recent.filter((length) => length >= currentCycleDay);
  const sample = eligible.length >= MIN_ELIGIBLE_SAMPLES ? eligible : recent;
  return Math.round(median(sample));
}

/**
 * Projects cycles forward from the open one, covering `untilDate`.
 *
 * The first entry is the open cycle itself, extended past today with its
 * projected length, so the chain begins where the user's real data ends with
 * no seam. Each subsequent cycle starts the day after the previous ends.
 *
 * The chain stops at the configured protocol ceiling rather than
 * extrapolating past the band the Marquette method is defined over.
 *
 * A projected cycle is computed, never stored: it carries a synthetic id and
 * is not a `CycleEntity`. Its window is the calendar rule over the lookback's
 * Peaks, which `deriveProjectedWindow` computes — the engine supplies no window
 * for a cycle with no readings of its own, because such a cycle has no end.
 *
 * Pure: no I/O, no framework imports.
 */
export function projectCycles(
  cycles: CycleResult[],
  settings: EngineSettings,
  today: DateKey,
  untilDate: DateKey,
): CycleResult[] {
  const newest = cycles[cycles.length - 1];
  if (!newest || newest.length !== null) {
    return [];
  }
  const closedLengths = cycles.filter((c) => c.length !== null).map((c) => c.length!);
  if (closedLengths.length === 0) {
    return [];
  }

  const history: CycleHistory = {
    firstPeaksByCycle: cycles.map((c) => c.firstPeakDay),
    lastPeaksByCycle: cycles.map((c) => c.lastPeakDay),
    cycleNos: cycles.map((c) => c.cycleNo),
  };

  const projected: CycleResult[] = [];
  let day1 = newest.day1;
  let userCycleNo = newest.cycleNo;

  while (day1 <= untilDate) {
    const currentCycleDay = diffDays(day1, today) + 1;
    if (currentCycleDay > settings.cycleMaxLength) {
      break;
    }
    const estimate = estimateProjectedLength(
      closedLengths,
      currentCycleDay,
      settings.historyWindow,
    );
    if (estimate === null) {
      break;
    }
    // A thin sample must not end the cycle before today.
    const length = Math.max(estimate, currentCycleDay);

    const result = computeCycle(
      { id: `${PROJECTED_CYCLE_ID_PREFIX}${userCycleNo}`, day1 },
      [],
      Math.max(userCycleNo, CALENDAR_RULE_THRESHOLD + 1),
      length,
      history,
      settings,
      today,
    );
    projected.push(projectedCycle(result, history, settings));

    day1 = addDays(day1, length);
    userCycleNo += 1;
  }

  return projected;
}

/**
 * A projected cycle's window, derived from the lookback's monitor Peaks.
 *
 * A projection is computed with an empty record array, so it holds no Peak of its own — and a cycle
 * with no Peak has no window end. The calendar rule over the lookback is therefore what gives a
 * projection its window, and each edge is taken from the reading its own rule uses: six days before the
 * earliest **Peak day** (a cycle's first monitor Peak reading) and three days after the latest **last**
 * Peak reading. With no Peak anywhere in the window the rule has no edges, so the composed protocol
 * default stands in — for a projection only. A cycle the user recorded is never given this window,
 * because for that cycle the absence of a Peak is reported rather than filled in.
 */
function deriveProjectedWindow(history: CycleHistory, settings: EngineSettings): FertileWindow {
  const windowSize = Math.max(1, settings.historyWindow);
  const firstInLookback = history.firstPeaksByCycle
    .slice(-windowSize)
    .filter((peak): peak is number => peak !== null);
  const lastInLookback = history.lastPeaksByCycle
    .slice(-windowSize)
    .filter((peak): peak is number => peak !== null);

  if (firstInLookback.length === 0) {
    return {
      begin: PROTOCOL_DEFAULT_WINDOW_BEGIN,
      end: PROTOCOL_DEFAULT_WINDOW_END,
      beginRule: "calendar-day-6",
      endRule: "protocol-fallback-window",
    };
  }

  return {
    begin: Math.min(...firstInLookback) - CALENDAR_BEGINS_BEFORE_EARLIEST_PEAK,
    end: Math.max(...lastInLookback) + DEFAULT_POST_PEAK_DAYS,
    beginRule: "calendar-earliest-peak-minus-6",
    endRule: "lookback-latest-peak-plus-n",
  };
}

/** Applies the derived window and re-derives every day's status from it. */
function projectedCycle(
  result: CycleResult,
  history: CycleHistory,
  settings: EngineSettings,
): CycleResult {
  const window = deriveProjectedWindow(history, settings);
  return {
    ...result,
    fertileWindow: window,
    days: result.days.map((day) => ({
      ...day,
      status: statusForCycleDay(window, result.lastPeakDay !== null, day.day),
    })),
  };
}
