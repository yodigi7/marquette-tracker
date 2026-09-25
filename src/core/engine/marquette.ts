import type {
  BeginRule,
  CycleHistory,
  CycleInput,
  CycleResult,
  DayRecordInput,
  DayResult,
  DayStatus,
  EndRule,
  EngineSettings,
  EngineWarning,
  FertileWindow,
  PeakSource,
} from './types'

export const CYCLE_LENGTH_MIN = 21
export const CYCLE_LENGTH_MAX = 42
/** Calendar fallback: earliest possible peak day 12 minus 6 yields fertile day 6. */
export const DEFAULT_EARLIEST_PEAK = 12
export const DEFAULT_POST_PEAK_DAYS = 4
export const DEFAULT_HISTORY_WINDOW = 6

function isHighOrPeak(record: DayRecordInput): boolean {
  return record.monitor === 'high' || record.monitor === 'peak'
}

/**
 * User-authored records only. An absent `dataOrigin` is legacy user data, so
 * inferred rows never become Peak, begin, or end evidence.
 */
function isUserEvidence(record: DayRecordInput): boolean {
  return record.dataOrigin !== 'inferred'
}

/** Monitor-only Peak evidence: a user-entered monitor Peak, never mucus. */
function computePeak(records: DayRecordInput[]): { peakDay: number | null; source: PeakSource } {
  let monitorPeak: number | null = null
  for (const record of records) {
    if (record.monitor === 'peak') {
      monitorPeak = record.dayInCycle
    }
  }
  if (monitorPeak !== null) {
    return { peakDay: monitorPeak, source: 'monitor' }
  }
  return { peakDay: null, source: 'none' }
}

function computeBegin(
  cycleNo: number,
  records: DayRecordInput[],
  history: CycleHistory,
  settings: EngineSettings,
): { begin: number; rule: BeginRule } {
  const windowSize = Math.max(1, settings.historyWindow)
  const historic = history.peaksByCycle.slice(-windowSize).filter((p): p is number => p !== null)

  let calendarBegin: number
  let calendarRule: BeginRule
  if (cycleNo <= 6) {
    calendarBegin = 6
    calendarRule = 'calendar-day-6'
  } else if (historic.length === 0) {
    calendarBegin = DEFAULT_EARLIEST_PEAK - 6
    calendarRule = 'calendar-earliest-peak-minus-6'
  } else {
    calendarBegin = Math.min(...historic) - 6
    calendarRule = 'calendar-earliest-peak-minus-6'
  }

  const firstHighDay = records.find((r) => isHighOrPeak(r))?.dayInCycle ?? null

  if (firstHighDay !== null && firstHighDay < calendarBegin) {
    return { begin: firstHighDay, rule: 'first-high-or-peak' }
  }
  return { begin: calendarBegin, rule: calendarRule }
}

function computeEnd(
  cycleNo: number,
  peakDay: number | null,
  history: CycleHistory,
  settings: EngineSettings,
): { end: number | null; rule: EndRule } {
  const windowSize = Math.max(1, settings.historyWindow)
  const historic = history.peaksByCycle.slice(-windowSize).filter((p): p is number => p !== null)

  if (cycleNo <= 6) {
    if (peakDay === null) {
      return { end: null, rule: 'none' }
    }
    return { end: peakDay + settings.postPeakDays, rule: 'current-peak-plus-n' }
  }

  if (peakDay !== null) {
    const currentEnd = peakDay + settings.postPeakDays
    if (historic.length === 0) {
      return { end: currentEnd, rule: 'current-peak-plus-n' }
    }
    const historicEnd = Math.max(...historic) + settings.postPeakDays
    if (historicEnd < currentEnd) {
      return { end: historicEnd, rule: 'earliest-end' }
    }
    return { end: currentEnd, rule: 'current-peak-plus-n' }
  }

  if (historic.length > 0) {
    return { end: Math.max(...historic) + settings.postPeakDays, rule: 'historic-peak-plus-n' }
  }
  return { end: null, rule: 'none' }
}

function statusForDay(day: number, window: FertileWindow, peakKnown: boolean): DayStatus {
  if (day < window.begin) {
    return 'pre-fertile'
  }
  if (window.end === null || day <= window.end) {
    return 'fertile'
  }
  return peakKnown ? 'post-peak' : 'post-calendar'
}

/** Day status extension for cycle days beyond the recorded ones (calendar extrapolation). */
export function statusForCycleDay(window: FertileWindow, peakKnown: boolean, day: number): DayStatus {
  return statusForDay(day, window, peakKnown)
}

function sourceForDay(day: number, window: FertileWindow, peakKnown: boolean): DayResult['source'] {
  if (day < window.begin) {
    return 'predicted'
  }
  if (day <= (window.end ?? Infinity)) {
    return window.beginRule === 'first-high-or-peak' ? 'confirmed' : 'predicted'
  }
  return peakKnown ? 'confirmed' : 'predicted'
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
 */
export function computeCycle(
  cycle: CycleInput,
  records: DayRecordInput[],
  cycleNo: number,
  length: number | null,
  history: CycleHistory,
  settings: EngineSettings,
): CycleResult {
  const sorted = [...records].sort((a, b) => a.dayInCycle - b.dayInCycle)
  // Day results cover every supplied record; only user-authored records are
  // allowed to establish Peak, begin, and end evidence.
  const evidence = sorted.filter(isUserEvidence)
  const { peakDay, source } = computePeak(evidence)

  const begin = computeBegin(cycleNo, evidence, history, settings)
  const end = computeEnd(cycleNo, peakDay, history, settings)
  const fertileWindow: FertileWindow = { begin: begin.begin, end: end.end, beginRule: begin.rule, endRule: end.rule }

  const days: DayResult[] = sorted.map((record) => ({
    day: record.dayInCycle,
    date: record.date,
    status: statusForDay(record.dayInCycle, fertileWindow, peakDay !== null),
    source: sourceForDay(record.dayInCycle, fertileWindow, peakDay !== null),
  }))

  const warnings: EngineWarning[] = []
  if (fertileWindow.end === null) {
    warnings.push({ kind: 'no-peak-end', cycleNo })
  }

  return {
    cycleId: cycle.id,
    cycleNo,
    day1: cycle.day1,
    length,
    peakDay,
    peakSource: source,
    fertileWindow,
    days,
    warnings,
  }
}