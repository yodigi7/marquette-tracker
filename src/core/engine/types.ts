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

export type BeginRule = "calendar-day-6" | "calendar-earliest-peak-minus-6" | "first-high-or-peak";
export type EndRule =
  | "current-peak-plus-n"
  | "historic-peak-plus-n"
  | "earliest-end"
  | "protocol-default-band"
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
  | { kind: "open-cycle-past-window-end"; cycleNo: number };

/** Previous-cycle peak days (oldest → newest) used by the calendar rules. */
export interface CycleHistory {
  peaksByCycle: (number | null)[];
  cycleNos: number[];
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
  /** Date of the next expected period start (for the newest cycle's day1). Null without data. */
  expectedPeriodStart: DateKey;
  /** Estimated next fertile window from the calendar rule — always a prediction. */
  nextFertileWindow: {
    begin: DateKey;
    end: DateKey;
  };
}
