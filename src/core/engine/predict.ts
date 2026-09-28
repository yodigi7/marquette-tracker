import { addDays, diffDays } from "./dateUtils";
import { DEFAULT_POST_PEAK_DAYS } from "./marquette";
import {
  estimateProjectedLength,
  PROTOCOL_DEFAULT_WINDOW_BEGIN,
  PROTOCOL_DEFAULT_WINDOW_END,
} from "./projection";
import type { CycleResult, DateKey, EngineSettings, Forecast, PeakDayRange } from "./types";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
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
  const closed = cycles.filter((c) => c.length !== null);
  if (closed.length === 0) {
    return null;
  }

  const lengths = closed.map((c) => c.length!);
  // First readings throughout: these are the cycles' Peak days, the values the calendar rule and every
  // reported range are built from. A cycle's last reading anchors only its own window end.
  const peaks = closed.map((c) => c.firstPeakDay).filter((p): p is number => p !== null);
  const lastPeaks = closed.map((c) => c.lastPeakDay).filter((p): p is number => p !== null);
  const newest = cycles[cycles.length - 1];

  const inBand = lengths.filter(
    (l) => l >= settings.cycleMinLength && l <= settings.cycleMaxLength,
  );
  const outOfBandCount = lengths.length - inBand.length;

  const meanLength = mean(lengths);
  // The newest cycle is always open, so this is the day the chain's first
  // link starts from.
  const currentCycleDay = diffDays(newest.day1, today) + 1;
  const projectedLength = estimateProjectedLength(lengths, currentCycleDay, settings.historyWindow);
  if (projectedLength === null) {
    // Unreachable: `closed` is non-empty, so `lengths` is too. Returning null
    // rather than inventing a date keeps the estimator's contract honest.
    return null;
  }
  const nextStart = addDays(newest.day1, projectedLength);
  const calendar = predictFertileWindow(newest.day1, peaks, lastPeaks, settings);
  const forecast: Forecast = {
    basedOnCycles: closed.length,
    lookbackWindow: Math.min(settings.historyWindow, closed.length),
    configuredLookbackWindow: settings.historyWindow,
    outOfBandCount,
    meanLength: round(meanLength),
    medianLength: round(median(lengths)),
    earliestLength: Math.min(...lengths),
    latestLength: Math.max(...lengths),
    firstPeakDayEarliest: peaks.length > 0 ? Math.min(...peaks) : 0,
    firstPeakDayLatest: peaks.length > 0 ? Math.max(...peaks) : 0,
    peakDayRangeInWindow: calendar.peakDayRange,
    expectedPeriodStart: nextStart,
    nextFertileWindow: { begin: calendar.begin, end: calendar.end },
  };
  return forecast;
}

/**
 * The next cycle's window from the calendar rule, plus the Peak days that rule was derived from.
 *
 * The two edges come from different readings, because the rules they implement do. The window opens
 * from the earliest **first** Peak day in the lookback — the calendar rule's "earliest peak day" — and
 * closes from the latest **last** Peak reading, since the end rule is defined through the last reading.
 * The reported range is the first-Peak range, so a surface reporting "your expected Peak day is X to Y"
 * reports the days that produced the open edge.
 *
 * The all-cycles pair on the forecast is a different statistic, and reporting it here would put a wider
 * range on screen beside a begin and end computed from these days.
 */
function predictFertileWindow(
  day1: string,
  firstPeaks: number[],
  lastPeaks: number[],
  settings: EngineSettings,
): { begin: string; end: string; peakDayRange: PeakDayRange | null } {
  const firstInWindow = firstPeaks.slice(-settings.historyWindow);
  const lastInWindow = lastPeaks.slice(-settings.historyWindow);
  let beginDay: number;
  let endDay: number;
  let peakDayRange: PeakDayRange | null;
  if (firstInWindow.length === 0) {
    // Shared with the projection's bounded fallback: one protocol default, not
    // two literals that happen to agree. The `- 6` below is a different rule
    // (earliest Peak day minus six) that coincidentally shares the value.
    beginDay = PROTOCOL_DEFAULT_WINDOW_BEGIN;
    endDay = PROTOCOL_DEFAULT_WINDOW_END;
    // The default band is a protocol constant, not a value read off the user's
    // own history, so it implies no Peak range.
    peakDayRange = null;
  } else {
    const earliest = Math.min(...firstInWindow);
    const latest = Math.max(...firstInWindow);
    beginDay = earliest - 6;
    endDay = Math.max(...lastInWindow) + DEFAULT_POST_PEAK_DAYS;
    peakDayRange = { earliest, latest, cycles: firstInWindow.length };
  }
  return {
    begin: addDays(day1, beginDay - 1),
    end: addDays(day1, endDay - 1),
    peakDayRange,
  };
}
