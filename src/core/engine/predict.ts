import { addDays } from './dateUtils'
import { CYCLE_LENGTH_MAX, CYCLE_LENGTH_MIN } from './marquette'
import type { CycleResult, EngineSettings, Forecast } from './types'

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
 * Pure: no I/O, no framework imports.
 */
export function computePredictions(cycles: CycleResult[], settings: EngineSettings): Forecast | null {
  const closed = cycles.filter((c) => c.length !== null)
  if (closed.length === 0) {
    return null
  }

  const lengths = closed.map((c) => c.length!)
  const peaks = closed.map((c) => c.peakDay).filter((p): p is number => p !== null)
  const newest = cycles[cycles.length - 1]

  const inBand = lengths.filter((l) => l >= CYCLE_LENGTH_MIN && l <= CYCLE_LENGTH_MAX)
  const outOfBandCount = lengths.length - inBand.length

  const meanLength = mean(lengths)
  const nextStart = addDays(newest.day1, Math.round(meanLength))
  const forecast: Forecast = {
    basedOnCycles: closed.length,
    outOfBandCount,
    meanLength: round(meanLength),
    medianLength: round(median(lengths)),
    earliestLength: Math.min(...lengths),
    latestLength: Math.max(...lengths),
    peakDayMean: peaks.length > 0 ? round(mean(peaks)) : 0,
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
    beginDay = 6
    endDay = 21
  } else {
    beginDay = Math.min(...lastWindow) - 6
    endDay = Math.max(...lastWindow) + settings.postPeakDays
  }
  return { begin: addDays(day1, beginDay - 1), end: addDays(day1, endDay - 1) }
}