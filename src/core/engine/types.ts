export type MonitorReading = 'none' | 'low' | 'high' | 'peak'
export type MucusLevel = 'none' | 'low' | 'high' | 'peak'
export type BloodFlow = 'none' | 'light' | 'medium' | 'heavy'
export type Goal = 'avoid-pregnancy' | 'achieve-pregnancy' | 'track-only'
export type Theme = 'light' | 'dark' | 'system'
export type PregnancyResult = 'negative' | 'positive'

/** Whether a stored observation came from the user or an app inference. */
export type DataOrigin = 'user' | 'inferred'

/** Controls when the persisted post-Peak Low tail begins. */
export type PostPeakFillMode = 'auto-after-window' | 'after-user-low'

/** Lineage for an inferred post-Peak Low reading. */
export interface PostPeakInference {
  rule: 'post-peak-low-tail'
  /** Latest user-entered monitor Peak day that anchors the tail. */
  peakDay: number
  postPeakDays: number
  anchorDate?: DateKey
  mode: PostPeakFillMode
}

/** A user deletion that prevents the same inference basis from recreating a date. */
export interface PostPeakSuppression {
  date: DateKey
  cycleId: string
  cycleDay1: DateKey
  peakDay: number
  postPeakDays: number
  mode: PostPeakFillMode
}

/** Calendar day key, format 'YYYY-MM-DD' (UTC). */
export type DateKey = string

/** The settings the engine needs. The store's Settings row may carry more (theme, algorithmEnabled). */
export interface EngineSettings {
  /** Days from last Peak day the fertile window extends. Monitor-only default: 4. */
  postPeakDays: number
  /** Number of previous cycles used for the calendar rules. Marquette default: 6. */
  historyWindow: number
  /** Protocol band floor in days. Marquette default: 21. */
  cycleMinLength: number
  /** Protocol band ceiling in days. Marquette default: 42. */
  cycleMaxLength: number
}

export interface CycleInput {
  id: string
  /** First day of menses (day 1 of the cycle). */
  day1: DateKey
  closedAt?: DateKey | null
  notes?: string
}

export interface DayRecordInput {
  id: string
  cycleId: string
  date: DateKey
  dayInCycle: number
  monitor?: MonitorReading
  /** Logged and displayed only; never engine evidence under the monitor-only contract. */
  mucus?: MucusLevel
  bloodFlow?: BloodFlow
  intercourse?: boolean
  intercourseTime?: string
  bbt?: number | null
  symptoms?: string[]
  pregnancyTest?: PregnancyResult
  notes?: string
  /** Absent on legacy rows; an absent value is treated as user-authored. */
  dataOrigin?: DataOrigin
}

export type DayStatus = 'pre-fertile' | 'fertile' | 'post-peak' | 'post-calendar'

export type BeginRule = 'calendar-day-6' | 'calendar-earliest-peak-minus-6' | 'first-high-or-peak'
export type EndRule = 'current-peak-plus-n' | 'historic-peak-plus-n' | 'earliest-end' | 'none'

export interface FertileWindow {
  begin: number
  /** Inclusive last fertile day. Null when the protocol cannot determine an end. */
  end: number | null
  beginRule: BeginRule
  endRule: EndRule
}

export interface DayResult {
  day: number
  date: DateKey
  status: DayStatus
  /** Calendar-derived vs. monitor-confirmed. */
  source: 'confirmed' | 'predicted'
}

/** Monitor-only contract: Peak evidence comes from a user-entered monitor Peak. */
export type PeakSource = 'monitor' | 'none'

export interface CycleResult {
  cycleId: string
  cycleNo: number
  day1: DateKey
  /** Days from day1 (inclusive) to the next cycle's day1. Null while open. */
  length: number | null
  peakDay: number | null
  peakSource: PeakSource
  fertileWindow: FertileWindow
  days: DayResult[]
  warnings: EngineWarning[]
}

export type EngineWarning =
  | { kind: 'cycle-out-of-band'; cycleNo: number; length: number }
  | { kind: 'no-peak-end'; cycleNo: number }

/** Previous-cycle peak days (oldest → newest) used by the calendar rules. */
export interface CycleHistory {
  peaksByCycle: (number | null)[]
  cycleNos: number[]
}

export interface Forecast {
  basedOnCycles: number
  /** Considered in the protocol band 21–42 days. */
  outOfBandCount: number
  meanLength: number
  medianLength: number
  earliestLength: number
  latestLength: number
  peakDayMean: number
  peakDayEarliest: number
  peakDayLatest: number
  /** Date of the next expected period start (for the newest cycle's day1). Null without data. */
  expectedPeriodStart: DateKey
  /** Estimated next fertile window from the calendar rule — always a prediction. */
  nextFertileWindow: {
    begin: DateKey
    end: DateKey
  }
}