import { addDays, diffDays } from './dateUtils'
import { estimateProjectedLength, PROTOCOL_DEFAULT_WINDOW_BEGIN, PROTOCOL_DEFAULT_WINDOW_END } from './projection'
import type { CycleResult, DateKey, EngineSettings, Forecast } from './types'

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Computes historical cycle stats and the forecast for the current (newest) cycle.
 * All forecast dates are predictions until confirmed by readings.
 *
 * `expectedPeriodStart` uses the same estimator as the Calendar's cycle
 * projection, so the two surfaces cannot report different dates for the same
 * event. That requires knowing how far into the open cycle we already are.
 *
 * Pure: no I/O, no framework imports.
 */
export function computePredictions(
  cycles: CycleResult[],
  settings: EngineSettings,
  today: DateKey,
): Forecast | null {
  const closed = cycles.filter((c) => c.length !== null)
  if (closed.length === 0) {
    return null
  }

  const lengths = closed.map((c) => c.length!)
  const peaks = closed.map((c) => c.peakDay).filter((p): p is number => p !== null)
  const newest = cycles[cycles.length - 1]

  const inBand = lengths.filter(
    (l) => l >= settings.cycleMinLength && l <= settings.cycleMaxLength,
  )
  const outOfBandCount = lengths.length - inBand.length

  const meanLength = mean(lengths)
  // The newest cycle is always open, so this is the day the chain's first
  // link starts from.
  const currentCycleDay = diffDays(newest.day1, today) + 1
  const projectedLength = estimateProjectedLength(lengths, currentCycleDay, settings.historyWindow)
  if (projectedLength === null) {
    // Unreachable: `closed` is non-empty, so `lengths` is too. Returning null
    // rather than inventing a date keeps the estimator's contract honest.
    return null
  }
  const nextStart = addDays(newest.day1, projectedLength)
  const forecast: Forecast = {
    basedOnCycles: closed.length,
    lookbackWindow: Math.min(settings.historyWindow, closed.length),
    configuredLookbackWindow: settings.historyWindow,
    outOfBandCount,
    meanLength: round(meanLength),
    medianLength: round(median(lengths)),
    earliestLength: Math.min(...lengths),
    latestLength: Math.max(...lengths),
    peakDayEarliest: peaks.length > 0 ? Math.min(...peaks) : 0,
    peakDayLatest: peaks.length > 0 ? Math.max(...peaks) : 0,
    expectedPeriodStart: nextStart,
    nextFertileWindow: predictFertileWindow(newest.day1, peaks, settings),
  }
  return forecast
}

function predictFertileWindow(day1: string, peaks: number[], settings: EngineSettings): { begin: string; end: string } {
  const lastWindow = peaks.slice(-settings.historyWindow)
  let beginDay: number
  let endDay: number
  if (lastWindow.length === 0) {
    // Shared with the projection's bounded fallback: one protocol default, not
    // two literals that happen to agree. The `- 6` below is a different rule
    // (earliest Peak minus six) that coincidentally shares the value.
    beginDay = PROTOCOL_DEFAULT_WINDOW_BEGIN
    endDay = PROTOCOL_DEFAULT_WINDOW_END
  } else {
    beginDay = Math.min(...lastWindow) - 6
    endDay = Math.max(...lastWindow) + settings.postPeakDays
  }
  return { begin: addDays(day1, beginDay - 1), end: addDays(day1, endDay - 1) }
}