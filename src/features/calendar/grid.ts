/** Month grid math: 6 weeks × 7 days, Monday-first, keys = local `YYYY-MM-DD`. */

import { dayInfo } from '@/core/cycleStatus'
import { addDays } from '@/core/engine/dateUtils'
import { dayInCycle, dateKeyLocal } from '@/core/dateKeys'
import type { CycleResult, DayStatus } from '@/core/engine/types'
import { cycleForDate, latestOpenCycle } from '@/core/store/selectors'
import type { CycleEntity, DayRecordEntity, WeekStart } from '@/core/store/entities'

export interface MonthGrid {
  /** 42 slots; slots outside the month are empty strings. */
  weeks: string[][]
  year: number
  month: number
}

export type { WeekStart } from '@/core/store/entities'

export function monthGrid(year: number, monthIndex: number, weekStart: WeekStart = 'monday'): MonthGrid {
  const first = new Date(year, monthIndex, 1)
  const offset = weekStart === 'sunday' ? first.getDay() : (first.getDay() + 6) % 7
  const start = new Date(year, monthIndex, 1 - offset)

  const weeks: string[][] = []
  for (let week = 0; week < 6; week++) {
    const row: string[] = []
    for (let day = 0; day < 7; day++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + day)
      const key = dateKeyLocal(date)
      row.push(date.getMonth() === monthIndex ? key : '')
    }
    weeks.push(row)
  }
  return { weeks, year, month: monthIndex }
}

export function monthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; month: number } {
  const total = year * 12 + monthIndex + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

/** Weekday short labels, Monday-first. */
export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const WEEKDAY_LABELS_SUNDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function weekdayLabels(weekStart: WeekStart = 'monday'): string[] {
  return weekStart === 'sunday' ? WEEKDAY_LABELS_SUNDAY : WEEKDAY_LABELS
}

export interface CellInfo {
  info: DayStatus | null
  forecast: boolean
  menses: boolean
  monitor: DayRecordEntity['monitor']
  intercourse: boolean
  /** True on the predicted ovulation day of the current open cycle (see `predictedOvulationDay`). */
  ovulation: boolean
}

/** Per-day resolution: cycle lookup → engine status → record markers → forecast overlay.
 * The status band is derived from the cycle's window, so it is painted for every
 * past day inside a cycle whether or not an observation was recorded. Future dates
 * stay blank and are covered only by the forecast outline; they get no menses dot.
 *
 * `predictedOvulationDay` is the cycle-day on which ovulation is estimated to occur in the
 * current open cycle (derived from historical Peak days). It marks a single future day.
 */
export function resolveCell(
  cycles: CycleEntity[],
  dayRecords: DayRecordEntity[],
  results: Map<string, CycleResult>,
  forecast: { begin: string; end: string } | undefined,
  dateKey: string,
  today: string,
  predictedOvulationDay?: number,
): CellInfo {
  const cycle = cycleForDate(cycles, dateKey)
  const record = cycle ? dayRecords.find((r) => r.cycleId === cycle.id && r.date === dateKey) : undefined

  const isFuture = dateKey > today
  const inForecast = !!forecast && dateKey >= forecast.begin && dateKey <= forecast.end
  const openCycle = latestOpenCycle(cycles)
  const ovulation =
    !!predictedOvulationDay &&
    !!openCycle &&
    cycle?.id === openCycle.id &&
    dateKey >= today &&
    dateKey === addDays(openCycle.day1, predictedOvulationDay - 1)

  return {
    // Derived from the window, so an unlogged day inside a cycle still has a
    // status. Future dates are left to the forecast treatment.
    info: isFuture ? null : statusForCell(cycle, results, dateKey),
    forecast: inForecast && isFuture && !record,
    menses: !isFuture && mensesFor(record, cycle ? dayInCycle(cycle.day1, dateKey) : 0),
    monitor: record?.monitor && record.monitor !== 'none' ? record.monitor : undefined,
    intercourse: !!record?.intercourse,
    ovulation,
  }
}

function statusForCell(cycle: CycleEntity | undefined, results: Map<string, CycleResult>, dateKey: string): DayStatus | null {
  if (!cycle) {
    return null
  }
  const result = results.get(cycle.id)
  if (!result) {
    return null
  }
  const dayNo = dayInCycle(cycle.day1, dateKey)
  const beyondCycle = cycle.closedAt !== null && dateKey > cycle.closedAt
  if (beyondCycle) {
    return null
  }
  return dayInfo(result.fertileWindow, result.peakDay !== null, dayNo)
}

function mensesFor(record: DayRecordEntity | undefined, dayNo: number): boolean {
  if (record?.bloodFlow !== undefined && record.bloodFlow !== 'none') {
    return true
  }
  return dayNo === 1
}