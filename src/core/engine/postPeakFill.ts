import { addDays, diffDays } from './dateUtils'
import type {
  DataOrigin,
  DateKey,
  MonitorReading,
  MucusLevel,
  PostPeakFillMode,
  PostPeakInference,
  PostPeakSuppression,
} from './types'

/** Maximum number of inferred Low rows in one post-Peak window. */
export const MAX_GENERATED_POST_PEAK_DAYS = 30

export interface PostPeakFillCycle {
  id: string
  day1: DateKey
  /** First day of the following cycle, or null for the open cycle. */
  nextDay1: DateKey | null
  /** Latest user-entered monitor Peak day, or null when no monitor Peak is known. */
  monitorPeakDay: number | null
}

export interface PostPeakFillDay {
  id: string
  cycleId: string
  date: DateKey
  dayInCycle: number
  monitor?: MonitorReading
  /** Logged and displayed only; never a tail anchor or interruption. */
  mucus?: MucusLevel
  dataOrigin?: DataOrigin
  inference?: PostPeakInference
}

export interface PostPeakFillInput {
  cycles: PostPeakFillCycle[]
  records: PostPeakFillDay[]
  mode: PostPeakFillMode
  postPeakDays: number
  today: DateKey
  suppressions?: PostPeakSuppression[]
}

export interface PlannedPostPeakReading {
  date: DateKey
  cycleId: string
  dayInCycle: number
  monitor: 'low'
  dataOrigin: 'inferred'
  inference: PostPeakInference
  /** Existing inferred row to retain/update, when one already occupies the date. */
  existingId?: string
}

export interface PostPeakFillPlan {
  generated: PlannedPostPeakReading[]
  staleIds: string[]
}

function isUserRecord(record: PostPeakFillDay): boolean {
  return record.dataOrigin !== 'inferred'
}

function isCurrentGeneratedRecord(
  record: PostPeakFillDay,
  cycle: PostPeakFillCycle,
  mode: PostPeakFillMode,
  postPeakDays: number,
): boolean {
  if (record.dataOrigin !== 'inferred') {
    return false
  }
  if (!record.inference) {
    // A generated row created before lineage metadata was introduced can still
    // be retained by date; the store will refresh its metadata on reconciliation.
    return true
  }
  return (
    record.inference.rule === 'post-peak-low-tail' &&
    record.inference.peakDay === cycle.monitorPeakDay &&
    record.inference.postPeakDays === postPeakDays &&
    record.inference.mode === mode
  )
}

function cycleDay(cycle: PostPeakFillCycle, date: DateKey): number {
  return diffDays(cycle.day1, date) + 1
}

/**
 * Plans the desired persisted post-Peak Low rows for every cycle.
 *
 * The planner is pure: it receives the current date and cycle/record context,
 * and returns desired generated rows plus inferred row ids that are stale.
 * It never creates dates after `today` or before the next cycle boundary.
 */
export function planPostPeakFill(input: PostPeakFillInput): PostPeakFillPlan {
  const cycles = [...input.cycles].sort((a, b) => (a.day1 < b.day1 ? -1 : a.day1 > b.day1 ? 1 : 0))
  const recordsByCycle = new Map<string, PostPeakFillDay[]>()
  for (const record of input.records) {
    const list = recordsByCycle.get(record.cycleId)
    if (list) {
      list.push(record)
    } else {
      recordsByCycle.set(record.cycleId, [record])
    }
  }

  const todayExclusive = addDays(input.today, 1)
  const generated: PlannedPostPeakReading[] = []
  const staleIds = new Set<string>()
  const cycleIds = new Set(cycles.map((cycle) => cycle.id))

  for (const record of input.records) {
    if (record.dataOrigin === 'inferred' && !cycleIds.has(record.cycleId)) {
      staleIds.add(record.id)
    }
  }

  for (const cycle of cycles) {
    const records = (recordsByCycle.get(cycle.id) ?? []).sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? -1 : 1
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
    const recordsByDate = new Map(records.map((record) => [record.date, record]))
    const activeSuppressionDates = new Set(
      (input.suppressions ?? [])
        .filter(
          (suppression) =>
            suppression.cycleId === cycle.id &&
            suppression.cycleDay1 === cycle.day1 &&
            suppression.peakDay === cycle.monitorPeakDay &&
            suppression.postPeakDays === input.postPeakDays &&
            suppression.mode === input.mode,
        )
        .map((suppression) => suppression.date),
    )
    const inferredByDate = new Map(
      records
        .filter((record) => record.dataOrigin === 'inferred')
        .map((record) => [record.date, record]),
    )

    // Every inferred row not selected below is stale, including rows from a
    // previous Peak/window basis. User rows are never candidates for deletion.
    for (const record of records) {
      if (record.dataOrigin === 'inferred') {
        staleIds.add(record.id)
      }
    }

    if (cycle.monitorPeakDay === null) {
      continue
    }

    const tailStartDay = cycle.monitorPeakDay + Math.max(0, input.postPeakDays) + 1
    const cycleEndExclusive =
      cycle.nextDay1 && cycle.nextDay1 < todayExclusive ? cycle.nextDay1 : todayExclusive
    if (cycleEndExclusive <= addDays(cycle.day1, tailStartDay - 1)) {
      continue
    }

    let anchor: PostPeakFillDay | undefined
    if (input.mode === 'after-user-low') {
      anchor = records
        .filter(
          (record) =>
            isUserRecord(record) &&
            record.monitor === 'low' &&
            record.dayInCycle >= tailStartDay &&
            record.date < cycleEndExclusive &&
            record.date <= input.today,
        )
        .sort((a, b) => (a.date < b.date ? -1 : 1))[0]
      if (!anchor) {
        continue
      }
    }

    // A user-entered monitor High on or after the active tail start ends the
    // tail: the reading itself signals that the post-Peak Low run is over.
    const stopDate = records.find(
      (record) =>
        isUserRecord(record) &&
        record.monitor === 'high' &&
        record.dayInCycle >= tailStartDay &&
        record.date < cycleEndExclusive,
    )?.date

    const firstDate =
      input.mode === 'after-user-low' && anchor
        ? addDays(anchor.date, 1)
        : addDays(cycle.day1, tailStartDay - 1)
    let generatedCount = 0

    for (let date = firstDate; date < cycleEndExclusive; date = addDays(date, 1)) {
      if (date > input.today) {
        break
      }
      if (stopDate !== undefined && date >= stopDate) {
        if (recordsByDate.get(date)?.dataOrigin === 'inferred') {
          staleIds.add(recordsByDate.get(date)!.id)
        }
        break
      }
      const existing = recordsByDate.get(date)
      if (activeSuppressionDates.has(date)) {
        if (existing?.dataOrigin === 'inferred') {
          staleIds.add(existing.id)
        }
        continue
      }
      if (existing && isUserRecord(existing)) {
        continue
      }

      if (generatedCount >= MAX_GENERATED_POST_PEAK_DAYS) {
        if (existing?.dataOrigin === 'inferred') {
          staleIds.add(existing.id)
        }
        continue
      }

      const retainExisting =
        existing !== undefined &&
        existing.monitor === 'low' &&
        isCurrentGeneratedRecord(existing, cycle, input.mode, input.postPeakDays)

      if (existing?.dataOrigin === 'inferred' && !retainExisting) {
        staleIds.add(existing.id)
      }

      generated.push({
        date,
        cycleId: cycle.id,
        dayInCycle: cycleDay(cycle, date),
        monitor: 'low',
        dataOrigin: 'inferred',
        inference: {
          rule: 'post-peak-low-tail',
          peakDay: cycle.monitorPeakDay,
          postPeakDays: input.postPeakDays,
          ...(anchor ? { anchorDate: anchor.date } : {}),
          mode: input.mode,
        },
        ...(retainExisting ? { existingId: existing.id } : {}),
      })
      generatedCount += 1
    }

    // Keep the set calculation explicit: all inferred rows in this cycle were
    // marked stale above, and retained rows were removed when emitted.
    for (const [date, record] of inferredByDate) {
      if (generated.some((item) => item.existingId === record.id) && date === record.date) {
        staleIds.delete(record.id)
      }
    }
  }

  return {
    generated,
    staleIds: [...staleIds].sort(),
  }
}
