import { addDays } from '@/core/engine/dateUtils'
import type { BeginRule, CycleResult, DateKey, DayStatus, EndRule, MonitorReading, MucusLevel } from '@/core/engine/types'
import type { CycleEntity, DayRecordEntity } from '@/core/store/entities'

export interface StripDay {
  day: number
  date: DateKey
  monitor?: MonitorReading
  mucus?: MucusLevel
  bbt: number | null
  intercourse: boolean
  status: DayStatus | null
  source: 'confirmed' | 'predicted'
}

export interface StripWindow {
  begin: number
  end: number | null
  source: 'confirmed' | 'predicted'
  beginRule: BeginRule
  endRule: EndRule
}

export interface StripModel {
  cycleId: string
  cycleNo: number
  day1: DateKey
  open: boolean
  span: number
  days: StripDay[]
  window: StripWindow | null
}

/**
 * Derives the chart data for one cycle from the store snapshot.
 * Pure: no Marquette computation — the window is copied from the engine result.
 */
export function buildStripModel(
  cycle: CycleEntity,
  result: CycleResult | undefined,
  records: DayRecordEntity[],
  algorithmEnabled: boolean,
): StripModel {
  const span = cycleSpan(result, records)
  const byDay = new Map<number, DayRecordEntity>()
  for (const record of records) {
    byDay.set(record.dayInCycle, record)
  }

  const days: StripDay[] = []
  for (let day = 1; day <= span; day++) {
    const record = byDay.get(day)
    const dayResult = result?.days.find((d) => d.day === day)
    days.push({
      day,
      date: record?.date ?? addDays(cycle.day1, day - 1),
      monitor: record?.monitor,
      mucus: record?.mucus,
      bbt: record?.bbt ?? null,
      intercourse: record?.intercourse === true,
      status: dayResult?.status ?? null,
      source: dayResult?.source ?? 'predicted',
    })
  }

  return {
    cycleId: cycle.id,
    cycleNo: cycle.cycleNo,
    day1: cycle.day1,
    open: cycle.closedAt === null,
    span,
    days,
    window: algorithmEnabled && result ? toStripWindow(result) : null,
  }
}

/** Closed cycle: engine length. Open/unknown: max(1, latest recorded day). */
function cycleSpan(result: CycleResult | undefined, records: DayRecordEntity[]): number {
  if (result && typeof result.length === 'number' && result.length > 0) {
    return result.length
  }
  let max = 1
  for (const record of records) {
    if (record.dayInCycle > max) {
      max = record.dayInCycle
    }
  }
  return max
}

/** Public span resolver for cycle lists (selector labels). */
export function cycleSpanOf(result: CycleResult | undefined, records: DayRecordEntity[]): number {
  return cycleSpan(result, records)
}

/** `Cycle N · starts Jan 29, 2026 · 6 days (open)` — selector option label. */
export function cycleLabel(cycle: CycleEntity, span: number): string {
  const date = new Date(`${cycle.day1}T00:00:00Z`)
  const starts = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const open = cycle.closedAt === null ? ' (open)' : ''
  return `Cycle ${cycle.cycleNo} · starts ${starts} · ${span} days${open}`
}

function toStripWindow(result: CycleResult): StripWindow {
  return {
    begin: result.fertileWindow.begin,
    end: result.fertileWindow.end,
    source: result.fertileWindow.beginRule === 'first-high-or-peak' ? 'confirmed' : 'predicted',
    beginRule: result.fertileWindow.beginRule,
    endRule: result.fertileWindow.endRule,
  }
}

/** BBT points for the right-axis line; null/blank days are dropped so the chart gaps. */
export function bbtSeries(days: StripDay[]): { day: number; bbt: number }[] {
  const out: { day: number; bbt: number }[] = []
  for (const day of days) {
    if (day.bbt !== null && day.bbt !== undefined) {
      out.push({ day: day.day, bbt: day.bbt })
    }
  }
  return out
}

/** Mucus marks; a stored explicit 'none' is user-signaled data and is kept. */
export function mucusSeries(days: StripDay[]): { day: number; level: MucusLevel }[] {
  const out: { day: number; level: MucusLevel }[] = []
  for (const day of days) {
    if (day.mucus !== undefined) {
      out.push({ day: day.day, level: day.mucus })
    }
  }
  return out
}

/** Intercourse markers; only true days. */
export function intercourseSeries(days: StripDay[]): { day: number }[] {
  const out: { day: number }[] = []
  for (const day of days) {
    if (day.intercourse) {
      out.push({ day: day.day })
    }
  }
  return out
}

/** Resolves the cycle to display: param match wins, else the newest cycle, else undefined. */
export function resolveSelectedCycle(cycles: CycleEntity[], param: string | undefined): CycleEntity | undefined {
  if (param) {
    const match = cycles.find((c) => c.id === param)
    if (match) {
      return match
    }
  }
  return cycles.length > 0 ? cycles[cycles.length - 1] : undefined
}