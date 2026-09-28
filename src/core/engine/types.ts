export type MonitorReading = "none" | "low" | "high" | "peak";
export type MucusLevel = "none" | "low" | "high" | "peak";
export type BloodFlow = "none" | "light" | "medium" | "heavy";
export type Goal = "avoid-pregnancy" | "achieve-pregnancy" | "track-only";
export type Theme = "light" | "dark" | "system";
export type PregnancyResult = "negative" | "positive";

/** Calendar day key, format 'YYYY-MM-DD' (UTC). */
export type DateKey = string;

/** The settings the engine needs. The store's Settings row may carry more (theme, algorithmEnabled). */
export interface EngineSettings {
  /** Number of previous cycles used for the calendar rules. Marquette default: 6. */
  historyWindow: number;
  /** Protocol band floor in days. Marquette default: 21. */
  cycleMinLength: number;
  /** Protocol band ceiling in days. Marquette default: 42. */
  cycleMaxLength: number;
}

export interface CycleInput {
  id: string;
  /** First day of menses (day 1 of the cycle). */
  day1: DateKey;
  closedAt?: DateKey | null;
  notes?: string;
}

export interface DayRecordInput {
  id: string;
  cycleId: string;
  date: DateKey;
  dayInCycle: number;
  monitor?: MonitorReading;
  /** Logged and displayed only; never engine evidence under the monitor-only contract. */
  mucus?: MucusLevel;
  bloodFlow?: BloodFlow;
  intercourse?: boolean;
  intercourseTime?: string;
  bbt?: number | null;
  symptoms?: string[];
  pregnancyTest?: PregnancyResult;
  notes?: string;
}

export type DayStatus = "pre-fertile" | "fertile" | "post-peak" | "post-calendar";

export type BeginRule =
  /** Cycles 1-6: day 6 is the rule itself. */
  | "calendar-day-6"
  /**
   * A cycle beyond the first six whose history window holds no monitor Peak to measure from, so day
   * 6 is reached by falling back to the cycles-1-6 rule rather than by applying the earliest-Peak one.
   * The begin *day* is 6 either way; only the rule that produced it differs.
   */
  | "calendar-day-6-fallback"
  | "calendar-earliest-peak-minus-6"
  | "first-high-or-peak";

/**
 * The fertile window's end, and the rule that produced it.
 *
 * Only `current-peak-plus-n` applies to a cycle the user has recorded: the protocol defines the end
 * solely through a monitor Peak, so a recorded cycle's end is its own Peak plus the fixed interval,
 * and a cycle holding no Peak has none. The two projection rules name a projected cycle's window,
 * which is computed from the lookback because a projection has no readings of its own — they are
 * never produced for a recorded cycle.
 */
export type EndRule =
  | "current-peak-plus-n"
  | "lookback-latest-peak-plus-n"
  | "protocol-fallback-window"
  | "none";

export interface FertileWindow {
  begin: number;
  /** Inclusive last fertile day. Null when the protocol cannot determine an end. */
  end: number | null;
  beginRule: BeginRule;
  endRule: EndRule;
}

export interface DayResult {
  day: number;
  date: DateKey;
  status: DayStatus;
}

/** Monitor-only contract: Peak evidence comes from a user-entered monitor Peak. */
export type PeakSource = "monitor" | "none";

/**
 * One monitor Peak day inside a cycle's history window, with the cycle it belongs to.
 *
 * This is the *input* to the calendar rule, not its output. A surface that states a window begin from
 * that rule can print these alongside the claim, so the claim is checkable where it is made.
 */
export interface LookbackPeak {
  cycleNo: number;
  peakDay: number;
}

export interface CycleResult {
  cycleId: string;
  cycleNo: number;
  day1: DateKey;
  /** Days from day1 (inclusive) to the next cycle's day1. Null while open. */
  length: number | null;
  peakDay: number | null;
  peakSource: PeakSource;
  fertileWindow: FertileWindow;
  days: DayResult[];
  warnings: EngineWarning[];
  /**
   * The lookback monitor Peak days the calendar rule was derived from, oldest first, restricted to
   * cycles that actually recorded one.
   *
   * Additive and never an input to `fertileWindow` — the begin day and rule above are computed without
   * reference to this field. Empty whenever the calendar rule did not produce the begin: cycles 1-6, a
   * begin set by the first High or Peak, or a window holding no Peak to measure from. A surface printing a
   * calendar-rule begin uses this to show its evidence; a surface printing any other begin shows none.
   */
  lookbackPeaks: LookbackPeak[];
}

export type EngineWarning =
  | { kind: "cycle-out-of-band"; cycleNo: number; length: number }
  | { kind: "no-peak-end"; cycleNo: number }
  /**
   * A user-entered monitor `high` or `peak` sits on a cycle day later than the computed window
   * end. The window is deliberately NOT moved: the protocol defines the end solely through the last
   * Peak, so the contradiction is reported rather than resolved.
   */
  | { kind: "monitor-evidence-outside-window"; cycleNo: number; day: number }
  /**
   * An open cycle whose computed window end precedes the current day. The cycle is still in
   * progress, so its days past that end are not settled and are reported as such. A closed cycle
   * with an end in the past is ordinary and never produces this.
   */
  | { kind: "open-cycle-past-window-end"; cycleNo: number }
  /**
   * The cycle's longest run of consecutive `high` readings reached the length at which the monitor's
   * own guidance is to stop testing, because a Peak is no longer expected. An observation about the
   * readings, not a contradiction: the run is never treated as a Peak and never moves a boundary.
   */
  | { kind: "high-run"; cycleNo: number; run: number };

/** Previous-cycle peak days (oldest → newest) used by the calendar rules. */
export interface CycleHistory {
  peaksByCycle: (number | null)[];
  cycleNos: number[];
}

/**
 * The monitor Peak days a cycle's calendar rule was derived from: the earliest and latest Peak inside
 * the configured history window, and how many cycles in that window carried one.
 *
 * Distinct from the all-cycles `Forecast.peakDayEarliest`/`peakDayLatest` pair, which describes the
 * user's whole record. A window that holds no monitor Peak has no range, so the field is nullable
 * rather than a `0` sentinel — `0` is not a cycle day.
 */
export interface PeakDayRange {
  earliest: number;
  latest: number;
  /** Cycles inside the window that carried a monitor Peak. */
  cycles: number;
}

export interface Forecast {
  basedOnCycles: number;
  /**
   * Number of recent closed cycle lengths the projected dates were derived
   * from — the configured history window, capped by the cycles available.
   */
  lookbackWindow: number;
  /** The configured history window, whether or not that many cycles exist. */
  configuredLookbackWindow: number;
  /** Considered in the protocol band 21–42 days. */
  outOfBandCount: number;
  meanLength: number;
  medianLength: number;
  earliestLength: number;
  latestLength: number;
  peakDayEarliest: number;
  peakDayLatest: number;
  /**
   * The monitor Peak days inside the configured history window — the ones `nextFertileWindow` was
   * actually derived from. Null when that window holds no monitor Peak. A surface showing an expected
   * Peak-day range must show this, not the all-cycles pair above, or it will contradict the window it
   * is displayed beside.
   */
  peakDayRangeInWindow: PeakDayRange | null;
  /** Date of the next expected period start (for the newest cycle's day1). Null without data. */
  expectedPeriodStart: DateKey;
  /** Estimated next fertile window from the calendar rule — always a prediction. */
  nextFertileWindow: {
    begin: DateKey;
    end: DateKey;
  };
}
