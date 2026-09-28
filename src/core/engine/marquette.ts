import { addDays, diffDays } from "./dateUtils";
import type {
  BeginRule,
  CycleHistory,
  CycleInput,
  CycleResult,
  DateKey,
  DayRecordInput,
  DayResult,
  DayStatus,
  EndRule,
  EngineSettings,
  EngineWarning,
  FertileWindow,
  PeakSource,
} from "./types";

export const CYCLE_LENGTH_MIN = 21;
export const CYCLE_LENGTH_MAX = 42;
/**
 * Calendar fallback: the earliest possible **first** monitor Peak day is 12, so 12 − 6 yields the
 * fertile day 6 the first-six-cycles rule uses.
 */
export const DEFAULT_EARLIEST_PEAK = 12;
/**
 * The monitor's minimum run of consecutive `peak` readings: two days.
 *
 * Fehring 2013, describing the monitor: "at a minimum the monitor usually will give the user at least
 * one day of 'high' fertility and two days of 'peak' fertility". Fehring 2008 reports ovulation
 * detected during "the 2 days of CPFM peak fertility" in 91.1% of cycles, which is only consistent
 * with a two-day span. Two is therefore the floor rather than the average, and it is what makes the
 * earliest possible *last* Peak day 13 rather than 12.
 */
export const MIN_PEAK_RUN_DAYS = 2;
/**
 * Protocol constant, not a preference: the fertile window ends "three full days past the last
 * peak reading" (Mu, Fehring & Bouchard, Linacre Q 2022;89(1):64-72). Every rule that extends the
 * window past a monitor Peak uses this value, so no stored or user-supplied setting can move it.
 */
export const DEFAULT_POST_PEAK_DAYS = 3;
export const DEFAULT_HISTORY_WINDOW = 6;

function isHighOrPeak(record: DayRecordInput): boolean {
  return record.monitor === "high" || record.monitor === "peak";
}

/**
 * Monitor-only Peak evidence, as the two readings the protocol uses separately.
 *
 * A cycle normally holds more than one monitor Peak: the device is specified to show Peak for a
 * minimum of two days (`MIN_PEAK_RUN_DAYS`). The protocol measures different ends of the fertile
 * window from different readings, so both are returned rather than one value standing in for the pair.
 * `firstPeakDay` is the cycle's Peak day — what the calendar rule and every surface naming a cycle's
 * Peak day use. `lastPeakDay` is the reading the window end is measured from.
 */
function computePeak(records: DayRecordInput[]): {
  firstPeakDay: number | null;
  lastPeakDay: number | null;
  source: PeakSource;
} {
  let firstPeakDay: number | null = null;
  let lastPeakDay: number | null = null;
  for (const record of records) {
    if (record.monitor === "peak") {
      if (firstPeakDay === null) {
        firstPeakDay = record.dayInCycle;
      }
      lastPeakDay = record.dayInCycle;
    }
  }
  if (lastPeakDay !== null) {
    return { firstPeakDay, lastPeakDay, source: "monitor" };
  }
  return { firstPeakDay: null, lastPeakDay: null, source: "none" };
}

function computeBegin(
  cycleNo: number,
  records: DayRecordInput[],
  history: CycleHistory,
  settings: EngineSettings,
): { begin: number; rule: BeginRule } {
  const windowSize = Math.max(1, settings.historyWindow);
  // The calendar rule's "earliest peak day" is each cycle's *first* monitor Peak reading, the day the
  // surge started. The last reading of a run is the anchor the window end comes from, and must not be
  // used here: measuring from it opens the window a day late for every two-day run.
  const historic = history.firstPeaksByCycle
    .slice(-windowSize)
    .filter((p): p is number => p !== null);

  let calendarBegin: number;
  let calendarRule: BeginRule;
  if (cycleNo <= 6) {
    calendarBegin = 6;
    calendarRule = "calendar-day-6";
  } else if (historic.length === 0) {
    // Same day as the cycles-1-6 rule, reached by falling back to it. Reported under its own value
    // so the rule a surface names is the rule that was applied.
    calendarBegin = DEFAULT_EARLIEST_PEAK - 6;
    calendarRule = "calendar-day-6-fallback";
  } else {
    calendarBegin = Math.min(...historic) - 6;
    calendarRule = "calendar-earliest-peak-minus-6";
  }

  const firstHighDay = records.find((r) => isHighOrPeak(r))?.dayInCycle ?? null;

  if (firstHighDay !== null && firstHighDay < calendarBegin) {
    return { begin: firstHighDay, rule: "first-high-or-peak" };
  }
  return { begin: calendarBegin, rule: calendarRule };
}

/**
 * The fertile window's end, measured from this cycle's own monitor Peak and from nothing else.
 *
 * The protocol defines the end only through a Peak, so a cycle holding none has no end at all. The
 * alternative — measuring from a Peak in an earlier cycle, or from whichever of the two ends first —
 * is what let an end land on a day before the Peak that defines it. `DEFAULT_POST_PEAK_DAYS` is a
 * protocol constant (see its own doc comment), so no input to this function can move it.
 */
function computeEnd(lastPeakDay: number | null): { end: number | null; rule: EndRule } {
  if (lastPeakDay === null) {
    return { end: null, rule: "none" };
  }
  return { end: lastPeakDay + DEFAULT_POST_PEAK_DAYS, rule: "current-peak-plus-n" };
}

/**
 * Consecutive `high` readings at which the monitor's own guidance is to stop testing, because a Peak
 * is no longer expected. A protocol threshold, not a preference.
 */
const HIGH_RUN_WARNING_DAYS = 9;

/**
 * The longest run of consecutive cycle days carrying a user-entered `high` reading.
 *
 * A `peak` ends the run, and so does any day that is not a `high` — including a day with no reading
 * at all, which is not a High. Over records already sorted by cycle day, so contiguity is a single
 * comparison per record.
 */
function longestHighRun(records: DayRecordInput[]): number {
  let longest = 0;
  let current = 0;
  for (const [index, record] of records.entries()) {
    const previous = index > 0 ? records[index - 1] : null;
    const consecutive =
      previous !== null &&
      previous.monitor === "high" &&
      previous.dayInCycle + 1 === record.dayInCycle;
    current = record.monitor === "high" ? (consecutive ? current + 1 : 1) : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

function statusForDay(day: number, window: FertileWindow, peakKnown: boolean): DayStatus {
  if (day < window.begin) {
    return "pre-fertile";
  }
  if (window.end === null || day <= window.end) {
    return "fertile";
  }
  return peakKnown ? "post-peak" : "post-calendar";
}

/** Day status extension for cycle days beyond the recorded ones (calendar extrapolation). */
export function statusForCycleDay(
  window: FertileWindow,
  peakKnown: boolean,
  day: number,
): DayStatus {
  return statusForDay(day, window, peakKnown);
}

/**
 * Days covered by a cycle's day results: its length when closed, otherwise the
 * days elapsed through `today`. An open cycle never reaches a future date —
 * the window can still move, and future dates belong to the forecast treatment.
 */
function cycleSpan(cycle: CycleInput, length: number | null, today: DateKey): number {
  if (length !== null) {
    return length;
  }
  return Math.max(1, diffDays(cycle.day1, today) + 1);
}

/**
 * Computes the fertile window and day statuses for a single cycle.
 *
 * Pure: no I/O, no framework imports. All derived from the provided records.
 * Peak, begin, and end come from user-authored monitor evidence only; inferred
 * records still receive a day result so coverage views can display them.
 *
 * @param cycleNo     cycle number (1-based), assigned by engineSdk via day1 ordering
 * @param length      cycle length in days; null while the cycle is open
 * @param history     previous cycles (peaks oldest → newest) for the calendar rules
 * @param today       current date; bounds an open cycle so no day result is
 *                    ever derived for a future date
 */
export function computeCycle(
  cycle: CycleInput,
  records: DayRecordInput[],
  cycleNo: number,
  length: number | null,
  history: CycleHistory,
  settings: EngineSettings,
  today: DateKey,
): CycleResult {
  const sorted = [...records].sort((a, b) => a.dayInCycle - b.dayInCycle);
  const { firstPeakDay, lastPeakDay, source } = computePeak(sorted);

  const begin = computeBegin(cycleNo, sorted, history, settings);
  const end = computeEnd(lastPeakDay);
  const fertileWindow: FertileWindow = {
    begin: begin.begin,
    end: end.end,
    beginRule: begin.rule,
    endRule: end.rule,
  };

  const days: DayResult[] = [];
  const span = cycleSpan(cycle, length, today);
  for (let day = 1; day <= span; day++) {
    days.push({
      day,
      date: addDays(cycle.day1, day - 1),
      status: statusForDay(day, fertileWindow, lastPeakDay !== null),
    });
  }

  const warnings: EngineWarning[] = [];
  if (fertileWindow.end === null) {
    warnings.push({ kind: "no-peak-end", cycleNo });
  } else {
    const windowEnd = fertileWindow.end;

    // An open cycle that has already run past its computed end is still in progress, so the days
    // after that end are not settled. `span` is the same bound the day results use, so the two
    // cannot disagree. A closed cycle is ordinary here and reports nothing.
    if (length === null && windowEnd < span) {
      warnings.push({ kind: "open-cycle-past-window-end", cycleNo });
    }

    // A High or Peak after the window end contradicts the computed window, because the window
    // closed on a day that reading says was still fertile. Only `high`/`peak` assert fertility;
    // a `low` is consistent with a closed window, and mucus/BBT are non-evidence. The window is
    // left untouched -- reporting the contradiction is the response, not moving the end.
    const offendingDay = sorted
      .filter(
        (record) =>
          (record.monitor === "high" || record.monitor === "peak") && record.dayInCycle > windowEnd,
      )
      .reduce<number | null>(
        (earliest, record) =>
          earliest === null ? record.dayInCycle : Math.min(earliest, record.dayInCycle),
        null,
      );
    if (offendingDay !== null) {
      warnings.push({ kind: "monitor-evidence-outside-window", cycleNo, day: offendingDay });
    }
  }

  // Deliberately outside the split above: a run of Highs is a fact about the readings, so it holds
  // whether or not an end was found. It is an observation rather than a contradiction — it never
  // becomes a Peak and never moves a boundary, the window above is already fixed.
  const highRun = longestHighRun(sorted);
  if (highRun >= HIGH_RUN_WARNING_DAYS) {
    warnings.push({ kind: "high-run", cycleNo, run: highRun });
  }

  return {
    cycleId: cycle.id,
    cycleNo,
    day1: cycle.day1,
    length,
    firstPeakDay,
    lastPeakDay,
    peakSource: source,
    fertileWindow,
    days,
    warnings,
  };
}
