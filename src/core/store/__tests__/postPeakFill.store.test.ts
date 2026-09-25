import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays } from '@/core/engine/dateUtils'
import { createDb } from '../db'
import { createAppStore } from '../useAppStore'
import { todayKey } from '@/core/dateKeys'
import type { DayRecordEntity } from '../entities'

function setup() {
  const db = createDb()
  const store = createAppStore(db)
  return { db, store }
}

function state(store: ReturnType<typeof createAppStore>) {
  return store.getState()
}

function generated(records: DayRecordEntity[]): DayRecordEntity[] {
  return records.filter((record) => record.dataOrigin === 'inferred')
}

function generatedIds(records: DayRecordEntity[]): string[] {
  return generated(records)
    .map((record) => record.id)
    .sort()
}

async function seedPeak(startOffset = -20) {
  const { db, store } = setup()
  const start = addDays(todayKey(), startOffset)
  const cycle = await store.getState().setNewCycle(start)
  await store.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
  await store.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })
  return { db, store, cycle, start }
}

beforeEach(async () => {
  await indexedDB.deleteDatabase('marquette-tracker')
})

describe('persisted post-Peak fill', () => {
  it('creates inferred Low rows through today in automatic mode', async () => {
    const { store, start } = await seedPeak()

    const rows = generated(state(store).dayRecords)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].date).toBe(addDays(start, 18))
    expect(rows.every((row) => row.monitor === 'low')).toBe(true)
    expect(rows.every((row) => row.date <= todayKey())).toBe(true)
    expect(rows.every((row) => row.dataOrigin === 'inferred')).toBe(true)
    expect(rows[0].inference?.rule).toBe('post-peak-low-tail')
  })

  it('waits for a user Low in user-anchor mode and does not fill earlier gaps', async () => {
    const { store } = setup()
    const start = addDays(todayKey(), -20)
    const cycle = await store.getState().setNewCycle(start)
    await store.getState().updateSettings({ postPeakFillMode: 'after-user-low' })
    await store.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
    await store.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })
    expect(generated(state(store).dayRecords)).toHaveLength(0)

    const anchor = addDays(start, 18)
    await store.getState().addDayRecord(cycle.id, anchor, 19, { monitor: 'low' })
    const rows = generated(state(store).dayRecords)
    expect(rows[0]?.date).toBe(addDays(start, 19))
    expect(rows.some((row) => row.date === addDays(start, 17))).toBe(false)
  })

  it('caps automatic generation at 30 rows for one post-Peak window', async () => {
    const { store, start } = await seedPeak(-60)
    const rows = generated(state(store).dayRecords)

    expect(rows).toHaveLength(30)
    expect(rows[0].date).toBe(addDays(start, 18))
    expect(rows[29].date).toBe(addDays(start, 47))
  })

  it('never generates future rows', async () => {
    const { store } = await seedPeak()
    expect(state(store).dayRecords.some((record) => record.date > todayKey())).toBe(false)
  })

  it('makes an explicit edit user-authoritative and preserves it', async () => {
    const { store, cycle, start } = await seedPeak()
    const generatedRow = generated(state(store).dayRecords)[0]
    await store.getState().addDayRecord(cycle.id, generatedRow.date, generatedRow.dayInCycle, { monitor: 'high' })

    const edited = state(store).dayRecords.find((record) => record.date === generatedRow.date)
    expect(edited?.dataOrigin).toBe('user')
    expect(edited?.monitor).toBe('high')
    expect(state(store).dayRecords.some((record) => record.date === addDays(start, 18))).toBe(true)
  })

  it('invalidates generated rows after a backfilled Menses boundary', async () => {
    const { store, cycle, start } = await seedPeak()
    const boundary = addDays(start, 18)
    await store.getState().addDayRecord(cycle.id, boundary, 19, { bloodFlow: 'heavy' })

    expect(state(store).cycles.map((item) => item.day1)).toContain(boundary)
    expect(state(store).dayRecords.some((record) => record.date === addDays(start, 19) && record.dataOrigin === 'inferred')).toBe(false)
  })

  it('invalidates the old tail when a user enters a later Peak', async () => {
    const { store, cycle, start } = await seedPeak()
    const laterPeak = addDays(start, 18)
    await store.getState().addDayRecord(cycle.id, laterPeak, 19, { monitor: 'peak' })

    const rows = generated(state(store).dayRecords)
    expect(rows.every((row) => row.date > laterPeak)).toBe(true)
  })

  it('stops generating after a user monitor High and removes the stale tail', async () => {
    const { store, cycle, start } = await seedPeak()
    const high = addDays(start, 19)
    await store.getState().addDayRecord(cycle.id, high, 20, { monitor: 'high' })

    const rows = generated(state(store).dayRecords)
    expect(rows.map((row) => row.date)).toEqual([addDays(start, 18)])
    expect(state(store).dayRecords.find((record) => record.date === high)?.dataOrigin).toBe('user')
    expect(state(store).dayRecords.some((record) => record.date === addDays(start, 20))).toBe(false)
  })

  it('ignores a monitor High that lands before the tail start', async () => {
    const { store, cycle, start } = await seedPeak()
    await store.getState().addDayRecord(cycle.id, addDays(start, 15), 16, { monitor: 'high' })

    expect(generated(state(store).dayRecords).map((row) => row.date)).toEqual([
      addDays(start, 18),
      addDays(start, 19),
      addDays(start, 20),
    ])
  })

  it('does not stop the tail for mucus or notes', async () => {
    const { store, cycle, start } = await seedPeak()
    await store.getState().addDayRecord(cycle.id, addDays(start, 19), 20, { mucus: 'peak', notes: 'peak mucus' })

    expect(generated(state(store).dayRecords).map((row) => row.date)).toEqual([
      addDays(start, 18),
      addDays(start, 20),
    ])
  })

  it('starts a fresh window and budget from a monitor Peak entered after a High', async () => {
    const { store, cycle, start } = await seedPeak(-60)
    await store.getState().addDayRecord(cycle.id, addDays(start, 18), 19, { monitor: 'high' })
    expect(generated(state(store).dayRecords)).toHaveLength(0)

    const laterPeak = addDays(start, 20)
    await store.getState().addDayRecord(cycle.id, laterPeak, 21, { monitor: 'peak' })

    const rows = generated(state(store).dayRecords)
    expect(rows[0].date).toBe(addDays(start, 25))
    expect(rows[0].inference?.peakDay).toBe(21)
    expect(rows).toHaveLength(30)
    expect(state(store).output?.cycles[0].peakDay).toBe(21)
  })

  it('keeps inferred rows in derived output while interpretation is on', async () => {
    const { store, start } = await seedPeak()
    const result = state(store).output?.cycles[0]
    expect(result?.days.some((day) => day.day === 19)).toBe(true)
    expect(result?.days.some((day) => day.date === addDays(start, 18))).toBe(true)
  })

  it('never lets generated rows move a cycle boundary', async () => {
    const { store, cycle, start } = await seedPeak()
    const cyclesBefore = state(store).cycles.map((item) => item.day1)

    await store.getState().addDayRecord(cycle.id, addDays(start, 19), 20, { monitor: 'high' })
    await store.getState().updateSettings({ postPeakDays: 2 })

    expect(state(store).cycles.map((item) => item.day1)).toEqual(cyclesBefore)
    expect(generated(state(store).dayRecords).every((row) => row.cycleId === cycle.id)).toBe(true)
  })

  it('reconciles mode changes without deleting user records', async () => {
    const { store, start } = await seedPeak()
    expect(generated(state(store).dayRecords).length).toBeGreaterThan(0)

    await store.getState().updateSettings({ postPeakFillMode: 'after-user-low' })
    expect(generated(state(store).dayRecords)).toHaveLength(0)
    expect(state(store).dayRecords.some((record) => record.date === start && record.bloodFlow === 'medium')).toBe(true)

    await store.getState().updateSettings({ postPeakFillMode: 'auto-after-window' })
    expect(generated(state(store).dayRecords).length).toBeGreaterThan(0)
    expect(state(store).dayRecords.some((record) => record.date === start && record.dataOrigin === 'user')).toBe(true)
  })

  it('recomputes the generated tail when postPeakDays changes', async () => {
    const { store, start } = await seedPeak()
    const oldStart = generated(state(store).dayRecords)[0].date
    await store.getState().updateSettings({ postPeakDays: 5 })

    const rows = generated(state(store).dayRecords)
    expect(rows[0].date).not.toBe(oldStart)
    expect(rows.every((row) => row.date >= addDays(start, 19))).toBe(true)
  })

  it('does not use inferred rows to derive initial cycle boundaries when enabled', async () => {
    const { db, store } = setup()
    const start = addDays(todayKey(), -10)
    const cycle = await store.getState().setNewCycle(start)
    await store.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
    await db.dayRecords.add({
      id: 'inferred-boundary-probe',
      cycleId: cycle.id,
      date: addDays(start, 1),
      dayInCycle: 2,
      monitor: 'low',
      dataOrigin: 'inferred',
      version: 1,
      synced: false,
      createdAt: '',
      updatedAt: '',
    })

    const updates: Array<{ id: string; closedAt: string | null }> = []
    const originalUpdate = db.cycles.update.bind(db.cycles)
    const updateSpy = vi.spyOn(db.cycles, 'update').mockImplementation((id, changes) => {
      const patch = changes as { closedAt?: string | null }
      if (Object.prototype.hasOwnProperty.call(changes, 'closedAt')) {
        const key = typeof id === 'string' ? id : id.id
        updates.push({ id: key, closedAt: patch.closedAt ?? null })
      }
      return originalUpdate(id, changes)
    })

    try {
      await store.getState().addDayRecord(cycle.id, addDays(start, 2), 3, { bloodFlow: 'heavy' })
      expect(updates).toEqual([])
    } finally {
      updateSpy.mockRestore()
    }
  })

  it('uses user evidence for placement and derived output while algorithm is off', async () => {
    const { db, store, cycle, start } = await seedPeak(-60)
    const peak = state(store).dayRecords.find((record) => record.monitor === 'peak')!

    await store.getState().updateSettings({ algorithmEnabled: false })
    await store.getState().removeDayRecord(peak.id)
    await db.dayRecords.add({
      id: 'manual-inferred-gap',
      cycleId: cycle.id,
      date: addDays(start, 19),
      dayInCycle: 20,
      monitor: 'low',
      dataOrigin: 'inferred',
      inference: {
        rule: 'post-peak-low-tail',
        peakDay: 14,
        postPeakDays: 3,
        mode: 'auto-after-window',
      },
      version: 1,
      synced: false,
      createdAt: '',
      updatedAt: '',
    })

    await store.getState().addDayRecord(cycle.id, addDays(start, 49), 50, { bloodFlow: 'heavy' })
    expect(state(store).cycles.map((item) => item.day1)).toEqual([start])
    const offResult = state(store).output?.cycles.find((result) => result.cycleId === cycle.id)
    expect(offResult?.days.map((day) => day.day)).toEqual([1, 50])
    expect(state(store).dayRecords.some((record) => record.id === 'manual-inferred-gap')).toBe(true)

    await store.getState().updateSettings({ algorithmEnabled: true })
    await store.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })
    const onResult = state(store).output?.cycles.find((result) => result.cycleId === cycle.id)
    expect(onResult?.days.some((day) => day.day === 19)).toBe(true)
  })

  it('keeps hydration false until initial reconciliation completes', async () => {
    const { db, store } = setup()
    const start = addDays(todayKey(), -20)
    const cycle = await store.getState().setNewCycle(start)
    await store.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
    await store.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })

    let releaseReconciliation!: () => void
    let reconciliationStarted!: () => void
    const gate = new Promise<void>((resolve) => {
      releaseReconciliation = resolve
    })
    const started = new Promise<void>((resolve) => {
      reconciliationStarted = resolve
    })
    const originalTransaction = db.transaction.bind(db) as (...args: unknown[]) => Promise<unknown>
    const transactionSpy = vi.spyOn(db, 'transaction').mockImplementation(((...args: unknown[]) => {
      reconciliationStarted()
      return gate.then(() => originalTransaction(...args))
    }) as typeof db.transaction)

    store.setState({ hydrated: false })
    const hydration = store.getState().hydrate()
    await started
    expect(state(store).hydrated).toBe(false)

    releaseReconciliation()
    await hydration
    expect(state(store).hydrated).toBe(true)
    transactionSpy.mockRestore()
  })

  it('leaves hydration false when initial reconciliation rejects', async () => {
    const { db, store } = setup()
    const toArraySpy = vi.spyOn(db.cycles, 'toArray').mockRejectedValueOnce(new Error('reconciliation failed'))
    store.setState({ hydrated: false })

    await expect(store.getState().hydrate()).rejects.toThrow('reconciliation failed')
    expect(state(store).hydrated).toBe(false)
    toArraySpy.mockRestore()
  })

  it('rolls back a day-record write when reconciliation fails', async () => {
    const { db, store, cycle, start } = await seedPeak()
    const beforeGenerated = generatedIds(state(store).dayRecords)
    const spy = vi.spyOn(db.cycles, 'toArray').mockRejectedValueOnce(new Error('reconciliation failed'))
    const date = addDays(start, 20)

    try {
      await expect(store.getState().addDayRecord(cycle.id, date, 21, { monitor: 'high' })).rejects.toThrow('reconciliation failed')
      expect((await db.dayRecords.toArray()).find((record) => record.date === date)?.dataOrigin).toBe('inferred')
      expect(generatedIds(await db.dayRecords.toArray())).toEqual(beforeGenerated)
    } finally {
      spy.mockRestore()
    }
  })

  it('rolls back an inferred-row deletion when reconciliation fails', async () => {
    const { db, store } = await seedPeak()
    const row = generated(state(store).dayRecords)[0]
    const beforeGenerated = generatedIds(state(store).dayRecords)
    const spy = vi.spyOn(db.cycles, 'toArray').mockRejectedValueOnce(new Error('reconciliation failed'))

    try {
      await expect(store.getState().removeDayRecord(row.id)).rejects.toThrow('reconciliation failed')
      expect(await db.dayRecords.get(row.id)).toBeDefined()
      expect(generatedIds(await db.dayRecords.toArray())).toEqual(beforeGenerated)
    } finally {
      spy.mockRestore()
    }
  })

  it('rolls back a settings update when reconciliation fails', async () => {
    const { db, store } = await seedPeak()
    const before = (await db.settings.get('main'))!.postPeakDays
    const beforeGenerated = generatedIds(state(store).dayRecords)
    const spy = vi.spyOn(db.cycles, 'toArray').mockRejectedValueOnce(new Error('reconciliation failed'))

    try {
      await expect(store.getState().updateSettings({ postPeakDays: 5 })).rejects.toThrow('reconciliation failed')
      expect((await db.settings.get('main'))!.postPeakDays).toBe(before)
      expect(generatedIds(await db.dayRecords.toArray())).toEqual(beforeGenerated)
    } finally {
      spy.mockRestore()
    }
  })

  it('rolls back a new-cycle mutation when reconciliation fails', async () => {
    const { db, store, start } = await seedPeak()
    const beforeGenerated = generatedIds(state(store).dayRecords)
    const originalToArray = db.cycles.toArray.bind(db.cycles)
    const spy = vi.spyOn(db.cycles, 'toArray')
      .mockImplementationOnce(() => originalToArray())
      .mockRejectedValueOnce(new Error('reconciliation failed'))

    try {
      await expect(store.getState().setNewCycle(addDays(todayKey(), -5))).rejects.toThrow('reconciliation failed')
      expect(await originalToArray()).toHaveLength(1)
      expect(generatedIds(await db.dayRecords.toArray())).toEqual(beforeGenerated)
      expect((await originalToArray())[0].day1).toBe(start)
    } finally {
      spy.mockRestore()
    }
  })

  it('preserves existing generated rows and creates no new ones while interpretation is off', async () => {
    const { store } = await seedPeak()
    const before = generated(state(store).dayRecords).map((record) => record.id)
    await store.getState().updateSettings({ algorithmEnabled: false })

    expect(generated(state(store).dayRecords).map((record) => record.id)).toEqual(before)
  })

  it('resumes reconciliation when interpretation is re-enabled', async () => {
    const { store, start } = await seedPeak()
    const before = generated(state(store).dayRecords).map((record) => record.id)

    await store.getState().updateSettings({ algorithmEnabled: false })
    await store.getState().updateSettings({ postPeakDays: 1 })
    expect(generated(state(store).dayRecords).map((record) => record.id)).toEqual(before)

    await store.getState().updateSettings({ algorithmEnabled: true })
    const after = generated(state(store).dayRecords)
    expect(after).toHaveLength(6)
    expect(after.map((record) => record.date)).toContain(addDays(start, 15))
    expect(after.map((record) => record.date)).toContain(addDays(start, 16))
  })

  it('does not let generated Low rows change Peak evidence or the fertile window', async () => {
    const { store } = setup()
    const start = addDays(todayKey(), -20)
    const cycle = await store.getState().setNewCycle(start)
    await store.getState().updateSettings({ algorithmEnabled: false })
    await store.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
    await store.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })

    const before = state(store).output?.cycles.find((result) => result.cycleId === cycle.id)
    expect(before?.peakDay).toBe(14)
    expect(before?.fertileWindow.end).toBe(18)

    await store.getState().updateSettings({ algorithmEnabled: true })
    const after = state(store).output?.cycles.find((result) => result.cycleId === cycle.id)
    expect(after?.peakDay).toBe(before?.peakDay)
    expect(after?.peakSource).toBe(before?.peakSource)
    expect(after?.fertileWindow).toEqual(before?.fertileWindow)
    expect(generated(state(store).dayRecords).length).toBeGreaterThan(0)
  })

  it('keeps the generated tail eligible after non-structural BBT and notes edits', async () => {
    const { store } = setup()
    const start = addDays(todayKey(), -20)
    const cycle = await store.getState().setNewCycle(start)
    await store.getState().updateSettings({ postPeakFillMode: 'after-user-low' })
    await store.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
    await store.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })

    const anchorDate = addDays(start, 18)
    await store.getState().addDayRecord(cycle.id, anchorDate, 19, { monitor: 'low' })
    const beforeDates = generated(state(store).dayRecords).map((record) => record.date)
    const beforeResult = state(store).output?.cycles.find((result) => result.cycleId === cycle.id)
    expect(beforeDates.length).toBeGreaterThan(0)

    await store.getState().addDayRecord(cycle.id, anchorDate, 19, { bbt: 36.4, notes: 'felt well' })

    const anchor = state(store).dayRecords.find((record) => record.date === anchorDate)
    const afterDates = generated(state(store).dayRecords).map((record) => record.date)
    const afterResult = state(store).output?.cycles.find((result) => result.cycleId === cycle.id)
    expect(anchor?.dataOrigin).toBe('user')
    expect(anchor?.bbt).toBe(36.4)
    expect(anchor?.notes).toBe('felt well')
    expect(afterDates).toEqual(beforeDates)
    expect(afterResult?.peakDay).toBe(beforeResult?.peakDay)
    expect(afterResult?.fertileWindow).toEqual(beforeResult?.fertileWindow)
  })

  it('keeps generated identity and cycle assignment stable across unrelated writes', async () => {
    const { store, cycle, start } = await seedPeak()
    const before = generated(state(store).dayRecords).map((record) => ({
      id: record.id,
      date: record.date,
      cycleId: record.cycleId,
      dayInCycle: record.dayInCycle,
    }))

    await store.getState().addDayRecord(cycle.id, addDays(start, 4), 5, { bbt: 36.4 })

    const after = generated(state(store).dayRecords).map((record) => ({
      id: record.id,
      date: record.date,
      cycleId: record.cycleId,
      dayInCycle: record.dayInCycle,
    }))
    expect(after).toEqual(before)
    expect(new Set(after.map((record) => record.date)).size).toBe(after.length)
  })

  it('keeps an explicitly deleted generated date absent after reconciliation', async () => {
    const { store } = await seedPeak()
    const generatedRow = generated(state(store).dayRecords).find((row) => row.dayInCycle === 20) ?? generated(state(store).dayRecords)[0]
    await store.getState().removeDayRecord(generatedRow.id)

    expect(state(store).dayRecords.some((record) => record.date === generatedRow.date)).toBe(false)
    expect(state(store).settings.postPeakSuppressions.some((item) => item.date === generatedRow.date)).toBe(true)

    await store.getState().updateSettings({ postPeakFillMode: 'auto-after-window' })
    expect(state(store).dayRecords.some((record) => record.date === generatedRow.date)).toBe(false)
  })

  it('clears a deletion suppression when the user records that date', async () => {
    const { store } = await seedPeak()
    const generatedRow = generated(state(store).dayRecords)[0]
    await store.getState().removeDayRecord(generatedRow.id)
    expect(state(store).settings.postPeakSuppressions.some((item) => item.date === generatedRow.date)).toBe(true)

    await store.getState().addDayRecord('', generatedRow.date, generatedRow.dayInCycle, { monitor: 'low' })
    expect(state(store).settings.postPeakSuppressions.some((item) => item.date === generatedRow.date)).toBe(false)
    expect(state(store).dayRecords.find((record) => record.date === generatedRow.date)?.dataOrigin).toBe('user')
  })

  it('ignores a deletion suppression when the post-Peak window changes', async () => {
    const { store } = await seedPeak()
    const generatedRow = generated(state(store).dayRecords).find((row) => row.dayInCycle === 20) ?? generated(state(store).dayRecords)[0]
    await store.getState().removeDayRecord(generatedRow.id)
    await store.getState().updateSettings({ postPeakDays: 2 })

    expect(state(store).dayRecords.some((record) => record.date === generatedRow.date)).toBe(true)
    expect(state(store).dayRecords.find((record) => record.date === generatedRow.date)?.dataOrigin).toBe('inferred')
  })

  it('treats legacy records without provenance as user data', async () => {
    const { db, store } = setup()
    const start = addDays(todayKey(), -20)
    const cycle = await store.getState().setNewCycle(start)
    await db.dayRecords.add({
      id: 'legacy-peak',
      cycleId: cycle.id,
      date: addDays(start, 13),
      dayInCycle: 14,
      monitor: 'peak',
      version: 1,
      synced: false,
      createdAt: '',
      updatedAt: '',
    })
    await store.setState({ hydrated: false })
    await store.getState().hydrate()

    expect(state(store).dayRecords.find((record) => record.id === 'legacy-peak')?.dataOrigin).toBeUndefined()
    expect(generated(state(store).dayRecords).length).toBeGreaterThan(0)
  })
})

