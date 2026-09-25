import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBackup, prepareBackup, serializeBackup } from '@/core/backup'
import { fullSnapshot, emptySnapshot } from '@/core/backup/__tests__/fixtures'
import { addDays } from '@/core/engine/dateUtils'
import { createDb } from '../db'
import { createAppStore } from '../useAppStore'
import { todayKey } from '@/core/dateKeys'

function setup() {
  const db = createDb()
  const store = createAppStore(db)
  return { db, store }
}

function state(store: ReturnType<typeof createAppStore>) {
  return store.getState()
}

function preparedSnapshot(snapshot = fullSnapshot()) {
  return prepareBackup(
    serializeBackup(
      createBackup(snapshot, {
        appVersion: '1.0.0',
        exportedAt: '2026-02-03T04:05:06.000Z',
      }),
    ),
  )
}

beforeEach(async () => {
  await indexedDB.deleteDatabase('marquette-tracker')
})

describe('backup snapshot and restore', () => {
  it('exports a consistent source snapshot without derived output', async () => {
    const { store } = setup()
    await state(store).hydrate()
    const cycle = await state(store).setNewCycle(addDays(todayKey(), -20))
    await state(store).addDayRecord(cycle.id, addDays(todayKey(), -6), 15, { monitor: 'peak' })

    const document = await state(store).createBackup()

    expect(document.format).toBe('marquette-tracker-backup')
    expect(document.data.cycles).toHaveLength(1)
    expect(document.data.dayRecords.some((record) => record.monitor === 'peak')).toBe(true)
    expect(document.data.settings.key).toBe('main')
    expect(document).not.toHaveProperty('data.output')
  })

  it('replaces records and settings, resets sync flags, and re-derives cycle structure', async () => {
    const { store } = setup()
    await state(store).hydrate()
    const existing = await state(store).setNewCycle(addDays(todayKey(), -5))
    await state(store).updateSettings({ goal: 'avoid-pregnancy' })
    const before = await state(store).createBackup()

    const incoming = fullSnapshot()
    incoming.dayRecords = incoming.dayRecords.map((record) => ({ ...record, cycleId: 'stale-cycle', dayInCycle: 99 }))
    incoming.settings = { ...incoming.settings, goal: 'achieve-pregnancy', synced: true }
    const prepared = preparedSnapshot(incoming)
    const result = await state(store).restoreBackup(prepared)

    const after = state(store)
    expect(result).toMatchObject({ cycleCount: 2, dayRecordCount: prepared.summary.dayRecordCount })
    expect(after.cycles.map((cycle) => cycle.id)).toContain('cycle-january')
    expect(after.dayRecords.some((record) => record.cycleId === 'stale-cycle')).toBe(false)
    expect(after.dayRecords.find((record) => record.id === 'user-peak')?.dayInCycle).toBe(14)
    expect(after.settings.goal).toBe('achieve-pregnancy')
    expect(after.settings.synced).toBe(false)
    expect(after.dayRecords.every((record) => record.synced === false)).toBe(true)
    expect(after.output?.cycles.some((cycle) => cycle.cycleId === 'cycle-january')).toBe(true)
    expect(before.data.settings.goal).toBe('avoid-pregnancy')
    expect(existing.id).toBeTruthy()
  })

  it('preserves inferred provenance and user overrides through reconciliation', async () => {
    const { store } = setup()
    await state(store).hydrate()
    const incoming = fullSnapshot()
    incoming.settings = { ...incoming.settings, postPeakFillMode: 'auto-after-window' }
    const prepared = preparedSnapshot(incoming)

    await state(store).restoreBackup(prepared)

    const records = state(store).dayRecords
    expect(records.find((record) => record.id === 'inferred-low')?.dataOrigin).toBe('inferred')
    expect(records.find((record) => record.id === 'edited-inferred-low')).toMatchObject({
      dataOrigin: 'user',
      monitor: 'high',
    })
  })

  it('retains inferred rows when the restored settings disable interpretation', async () => {
    const { store } = setup()
    await state(store).hydrate()
    const incoming = fullSnapshot()
    incoming.settings = { ...incoming.settings, algorithmEnabled: false }
    const prepared = preparedSnapshot(incoming)

    await state(store).restoreBackup(prepared)

    expect(state(store).settings.algorithmEnabled).toBe(false)
    expect(state(store).dayRecords.find((record) => record.id === 'inferred-low')?.dataOrigin).toBe('inferred')
  })

  it('restores an empty dataset and its settings', async () => {
    const { store } = setup()
    await state(store).hydrate()
    const prepared = preparedSnapshot(emptySnapshot())

    await state(store).restoreBackup(prepared)

    expect(state(store).cycles).toEqual([])
    expect(state(store).dayRecords).toEqual([])
    expect(state(store).settings.goal).toBe('track-only')
    expect(state(store).output?.cycles).toEqual([])
  })

  it('keeps pinned cycle boundaries and stable identities when re-deriving', async () => {
    const { store } = setup()
    await state(store).hydrate()
    const incoming = fullSnapshot()
    incoming.cycles = incoming.cycles.map((cycle) => ({ ...cycle, cycleNo: 99, closedAt: null }))
    const prepared = preparedSnapshot(incoming)

    await state(store).restoreBackup(prepared)

    expect(state(store).cycles.find((cycle) => cycle.id === 'cycle-january')).toMatchObject({
      day1: '2026-01-01',
      cycleNo: 1,
      pinned: true,
    })
    expect(state(store).cycles.find((cycle) => cycle.id === 'cycle-february')?.closedAt).toBe(null)
  })

  it('rejects duplicate day-record dates before replacing the dataset', async () => {
    const { store } = setup()
    await state(store).hydrate()
    await state(store).setNewCycle('2026-03-01')
    await state(store).addDayRecord('', '2026-03-01', 1, { bloodFlow: 'medium' })
    const beforeCycles = state(store).cycles.map((cycle) => cycle.id)
    const beforeRecords = state(store).dayRecords.map((record) => record.id)
    const prepared = preparedSnapshot(fullSnapshot())
    prepared.document.data.dayRecords.push({
      ...prepared.document.data.dayRecords[0],
      id: 'duplicate-date',
    })

    await expect(state(store).restoreBackup(prepared)).rejects.toMatchObject({ code: 'duplicate-date' })
    expect(state(store).cycles.map((cycle) => cycle.id)).toEqual(beforeCycles)
    expect(state(store).dayRecords.map((record) => record.id)).toEqual(beforeRecords)
  })

  it('rolls back the replacement when reconciliation fails', async () => {
    const { db, store } = setup()
    await state(store).hydrate()
    await state(store).setNewCycle('2026-03-01')
    await state(store).addDayRecord('', '2026-03-01', 1, { bloodFlow: 'medium' })
    const beforeCycles = state(store).cycles.map((cycle) => cycle.id)
    const beforeRecords = state(store).dayRecords.map((record) => record.id)
    const prepared = preparedSnapshot(fullSnapshot())
    const failure = vi.spyOn(db.cycles, 'toArray').mockRejectedValueOnce(new Error('restore failed'))

    try {
      await expect(state(store).restoreBackup(prepared)).rejects.toThrow('restore failed')
      expect(state(store).cycles.map((cycle) => cycle.id)).toEqual(beforeCycles)
      expect(state(store).dayRecords.map((record) => record.id)).toEqual(beforeRecords)
    } finally {
      failure.mockRestore()
    }
  })
})
