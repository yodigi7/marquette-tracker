import { addDays } from '@/core/engine/dateUtils'
import type { DateKey } from '@/core/engine/types'
import { todayKey } from '@/core/dateKeys'
import type { DayRecordEntity } from './entities'
import { db } from './db'
import { newUuid } from './repositories'

/**
 * TEMPORARY demo-data generator.
 * Builds ~6 months of plausible Marquette data (5 closed cycles + one open cycle
 * currently in progress) so the app has something to render on first startup.
 * Writes directly to the DB, then the store reloads via `refresh()`.
 */

interface ClosedCycle {
  day1: DateKey
  len: number
  peakDay: number
  closedAt: DateKey
}

function metaStamp(): string {
  return new Date().toISOString()
}

function freshMeta() {
  const stamp = metaStamp()
  return { version: 1, synced: false, createdAt: stamp, updatedAt: stamp }
}

/** Deterministic-ish closed cycles, back from the day before the open cycle. */
function buildClosedCycles(currentStart: DateKey): ClosedCycle[] {
  // Peak days keep the luteal phase (length − peak) within the typical 12–16 days.
  const lengths = [29, 31, 28, 33, 30]
  const peaks = [15, 16, 14, 19, 15]
  const out: ClosedCycle[] = []
  let end = addDays(currentStart, -1)
  for (let i = lengths.length - 1; i >= 0; i--) {
    const len = lengths[i]
    const day1 = addDays(end, -(len - 1))
    out.push({ day1, len, peakDay: peaks[i], closedAt: end })
    end = addDays(day1, -1)
  }
  return out.reverse()
}

function record(cycleId: string, date: DateKey, day: number, patch: Partial<DayRecordEntity>): DayRecordEntity {
  return { id: newUuid(), cycleId, date, dayInCycle: day, ...freshMeta(), ...patch }
}

/**
 * Realistic biphasic basal temperature: stable ~36.2–36.3 °C before ovulation, then
 * a ~0.3 °C thermal shift after the Peak day that stays elevated. `peak` null → no shift yet.
 */
function bbtFor(day: number, peak: number | null): number {
  const base = 36.22 + (day % 4) * 0.02
  const elevated = peak !== null && day > peak
  return Math.round((base + (elevated ? 0.3 : 0)) * 100) / 100
}

export async function seedDemoData(): Promise<void> {
  await db.transaction('rw', db.cycles, db.dayRecords, db.settings, async () => {
    await db.cycles.clear()
    await db.dayRecords.clear()
    await db.settings.clear()

    const today = todayKey()

    // Open cycle currently in progress: today is day 16.
    const currentStart = addDays(today, -(16 - 1))
    const closed = buildClosedCycles(currentStart)

    let cycleNo = 1
    for (const c of closed) {
      const id = newUuid()
      await db.cycles.add({
        id,
        day1: c.day1,
        cycleNo: cycleNo++,
        closedAt: c.closedAt,
        notes: '',
        ...freshMeta(),
      })

      const records: DayRecordEntity[] = []
      records.push(record(id, c.day1, 1, { bloodFlow: 'heavy' }))
      for (const day of [2, 3]) records.push(record(id, addDays(c.day1, day - 1), day, { bloodFlow: 'medium' }))
      records.push(record(id, addDays(c.day1, 3), 4, { bloodFlow: 'light' }))

      const peak = c.peakDay
      for (let day = 5; day <= c.len; day++) {
        const date = addDays(c.day1, day - 1)
        const patch: Partial<DayRecordEntity> = { bbt: bbtFor(day, peak) }
        if (day < peak - 3) {
          patch.monitor = 'low'
        } else if (day < peak) {
          patch.monitor = 'high'
        } else if (day === peak) {
          patch.monitor = 'peak'
        }
        if (day === peak - 3) patch.mucus = 'low'
        if (day === peak - 2) patch.mucus = 'high'
        if (day === peak) patch.mucus = 'peak'
        if (day === peak + 1) patch.pregnancyTest = 'negative'
        if (day === peak + 4) {
          patch.intercourse = true
          patch.intercourseTime = '22:30'
        }
        records.push(record(id, date, day, patch))
      }
      await db.dayRecords.bulkAdd(records)
    }

    // Open cycle.
    const openId = newUuid()
    await db.cycles.add({
      id: openId,
      day1: currentStart,
      cycleNo,
      closedAt: null,
      notes: '',
      ...freshMeta(),
    })
    const openRecords: DayRecordEntity[] = []
    openRecords.push(record(openId, currentStart, 1, { bloodFlow: 'heavy' }))
    for (const day of [2, 3]) openRecords.push(record(openId, addDays(currentStart, day - 1), day, { bloodFlow: 'medium' }))
    for (let day = 4; day <= 15; day++) {
      const date = addDays(currentStart, day - 1)
      const patch: Partial<DayRecordEntity> = day <= 4 ? { bloodFlow: 'light' } : {}
      patch.monitor = day < 12 ? 'low' : 'high'
      patch.bbt = bbtFor(day, null)
      openRecords.push(record(openId, date, day, patch))
    }
    await db.dayRecords.bulkAdd(openRecords)
  })
}
