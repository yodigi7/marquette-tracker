import { addDays, diffDays } from './dateUtils'
import { computeCycle, statusForCycleDay } from './marquette'
import type { CycleHistory, CycleResult, DateKey, EngineSettings, FertileWindow } from './types'

/** Minimum eligible samples before the conditioned estimate is trusted. */
const MIN_ELIGIBLE_SAMPLES = 2

/**
 * Cycle number at which the protocol's calendar rule replaces the cycles-1-6
 * shortcut. A projected cycle always selects the calendar rule: it has no
 * monitor Peak of its own, so no branch that requires one could ever apply.
 */
const CALENDAR_RULE_THRESHOLD = 6

/**
 * Window used when there is no Peak history at all, so the calendar rule has
 * no edges to work from. Mirrors the next-fertile-window fallback; both
 * surfaces must agree on the same protocol default.
 */
export const PROTOCOL_DEFAULT_WINDOW_BEGIN = 6
export const PROTOCOL_DEFAULT_WINDOW_END = 21

/** Ids for projected cycles are synthetic and must never collide with stored ones. */
const PROJECTED_CYCLE_ID_PREFIX = 'projected-'

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
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
  const recent = closedLengths.slice(-Math.max(1, historyWindow))
  if (recent.length === 0) {
    return null
  }
  const eligible = recent.filter((length) => length >= currentCycleDay)
  const sample = eligible.length >= MIN_ELIGIBLE_SAMPLES ? eligible : recent
  return Math.round(median(sample))
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
 * is not a `CycleEntity`. Its window comes from `computeCycle`, so it is the
 * same calendar rule the engine already applies to a cycle with no readings.
 *
 * Pure: no I/O, no framework imports.
 */
export function projectCycles(
  cycles: CycleResult[],
  settings: EngineSettings,
  today: DateKey,
  untilDate: DateKey,
): CycleResult[] {
  const newest = cycles[cycles.length - 1]
  if (!newest || newest.length !== null) {
    return []
  }
  const closedLengths = cycles.filter((c) => c.length !== null).map((c) => c.length!)
  if (closedLengths.length === 0) {
    return []
  }

  const history: CycleHistory = {
    peaksByCycle: cycles.map((c) => c.peakDay),
    cycleNos: cycles.map((c) => c.cycleNo),
  }

  const projected: CycleResult[] = []
  let day1 = newest.day1
  let userCycleNo = newest.cycleNo

  while (day1 <= untilDate) {
    const currentCycleDay = diffDays(day1, today) + 1
    if (currentCycleDay > settings.cycleMaxLength) {
      break
    }
    const estimate = estimateProjectedLength(closedLengths, currentCycleDay, settings.historyWindow)
    if (estimate === null) {
      break
    }
    // A thin sample must not end the cycle before today.
    const length = Math.max(estimate, currentCycleDay)

    const result = computeCycle(
      { id: `${PROJECTED_CYCLE_ID_PREFIX}${userCycleNo}`, day1 },
      [],
      Math.max(userCycleNo, CALENDAR_RULE_THRESHOLD + 1),
      length,
      history,
      settings,
      today,
    )
    projected.push(boundWindow(result))

    day1 = addDays(day1, length)
    userCycleNo += 1
  }

  return projected
}

/**
 * Gives a projected cycle a window that ends.
 *
 * With no Peak history the calendar rule has no edges, so the engine reports
 * an open window, which would paint every remaining day of the cycle fertile
 * forever. The protocol's standard first-cycle band is used instead, and the
 * derived days are recomputed with the engine's own status function.
 */
function boundWindow(result: CycleResult): CycleResult {
  if (result.fertileWindow.end !== null) {
    return result
  }
  const window: FertileWindow = {
    begin: PROTOCOL_DEFAULT_WINDOW_BEGIN,
    end: PROTOCOL_DEFAULT_WINDOW_END,
    beginRule: 'calendar-day-6',
    endRule: 'protocol-default-band',
  }
  return {
    ...result,
    fertileWindow: window,
    days: result.days.map((day) => ({
      ...day,
      status: statusForCycleDay(window, result.peakDay !== null, day.day),
    })),
  }
}
