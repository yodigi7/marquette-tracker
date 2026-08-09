import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../db'
import { createAppStore } from '../useAppStore'

function setup() {
  const db = createDb()
  const useStore = createAppStore(db)
  return { db, store: useStore }
}

function state(store: ReturnType<typeof createAppStore>) {
  return store.getState()
}

beforeEach(async () => {
  await indexedDB.deleteDatabase('marquette-tracker')
})

describe('store hydration', () => {
  it('hydrates with default settings and no data', async () => {
    const { store } = setup()
    await store.getState().hydrate()
    const s = state(store)
    expect(s.hydrated).toBe(true)
    expect(s.cycles).toEqual([])
    expect(s.dayRecords).toEqual([])
    expect(s.settings.postPeakDays).toBe(3)
    expect(s.settings.algorithmEnabled).toBe(true)
    expect(s.settings.goal).toBe('track-only')
  })
})

describe('day records', () => {
  it('upserts by cycle+date without creating duplicates', async () => {
    const { store } = setup()
    const { id: cycleId } = await store.getState().setNewCycle('2026-01-01')
    const put = store.getState().addDayRecord
    await put(cycleId, '2026-01-10', 10, { monitor: 'high' })
    await put(cycleId, '2026-01-10', 10, { monitor: 'peak' })
    expect(state(store).dayRecords).toHaveLength(1)
    expect(state(store).dayRecords[0].monitor).toBe('peak')
    expect(state(store).dayRecords[0].version).toBe(2)
    expect(state(store).dayRecords[0].synced).toBe(false)
  })

  it('engine output recomputes when a peak is logged (end = peak + 3)', async () => {
    const { store } = setup()
    const { id: cycleId } = await store.getState().setNewCycle('2026-01-01')
    await store.getState().addDayRecord(cycleId, '2026-01-14', 14, { monitor: 'peak' })
    const cycle = state(store).output?.cycles[0]
    expect(cycle?.fertileWindow.begin).toBe(6)
    expect(cycle?.fertileWindow.end).toBe(17)
    expect(cycle?.peakDay).toBe(14)
  })

  it('removing a day record reverts the derived window', async () => {
    const { store } = setup()
    const { id: cycleId } = await store.getState().setNewCycle('2026-01-01')
    await store.getState().addDayRecord(cycleId, '2026-01-14', 14, { monitor: 'peak' })
    const recordId = state(store).dayRecords[0].id
    await store.getState().removeDayRecord(recordId)
    expect(state(store).dayRecords).toHaveLength(0)
    expect(state(store).output?.cycles[0].fertileWindow.end).toBeNull()
  })
})

describe('cycles', () => {
  it('setNewCycle closes the open cycle at day1-1 and bumps cycleNo', async () => {
    const { store } = setup()
    const first = await store.getState().setNewCycle('2026-01-01')
    await store.getState().addDayRecord(first.id, '2026-01-20', 20, { monitor: 'low' })
    const second = await store.getState().setNewCycle('2026-02-01')
    const s = state(store)
    expect(s.cycles).toHaveLength(2)
    expect(s.cycles[0].closedAt).toBe('2026-01-31')
    expect(s.cycles[1].cycleNo).toBe(2)
    expect(second.day1).toBe('2026-02-01')
    expect(s.cycles[1].day1).toBe('2026-02-01')
  })

  it('setNewCycle is a no-op when day1 is not later than the open cycle', async () => {
    const { store } = setup()
    await store.getState().setNewCycle('2026-01-01')
    await store.getState().setNewCycle('2026-01-01')
    expect(state(store).cycles).toHaveLength(1)
  })

  it('records land in their own cycle results', async () => {
    const { store } = setup()
    const first = await store.getState().setNewCycle('2026-01-01')
    const second = await store.getState().setNewCycle('2026-02-01')
    await store.getState().addDayRecord(first.id, '2026-01-14', 14, { monitor: 'peak' })
    await store.getState().addDayRecord(second.id, '2026-02-12', 12, { monitor: 'high' })
    const cycles = state(store).output!.cycles
    expect(cycles).toHaveLength(2)
    expect(cycles[0].cycleNo).toBe(1)
    expect(cycles[0].days.map((d) => d.day)).toEqual([14])
    expect(cycles[1].days.map((d) => d.day)).toEqual([12])
    expect(cycles[1].length).toBeNull()
  })
})

describe('settings & data lifecycle', () => {
  it('changing postPeakDays recomputes the window', async () => {
    const { store } = setup()
    const { id: cycleId } = await store.getState().setNewCycle('2026-01-01')
    await store.getState().addDayRecord(cycleId, '2026-01-14', 14, { monitor: 'peak' })
    expect(state(store).output!.cycles[0].fertileWindow.end).toBe(17)
    await store.getState().updateSettings({ postPeakDays: 6 })
    expect(state(store).settings.postPeakDays).toBe(6)
    expect(state(store).output!.cycles[0].fertileWindow.end).toBe(20)
  })

  it('persists across store instances (round trip)', async () => {
    const db = createDb()
    const first = createAppStore(db)
    await first.getState().hydrate()
    const { id } = await first.getState().setNewCycle('2026-01-01')
    await first.getState().addDayRecord(id, '2026-01-14', 14, { monitor: 'peak' })

    const second = createAppStore(db)
    await second.getState().hydrate()
    const s = state(second)
    expect(s.cycles).toHaveLength(1)
    expect(s.cycles[0].day1).toBe('2026-01-01')
    expect(s.dayRecords[0].monitor).toBe('peak')
    expect(s.settings.postPeakDays).toBe(3)
  })

  it('clearAllData wipes everything and resets defaults', async () => {
    const { store } = setup()
    const { id: cycleId } = await store.getState().setNewCycle('2026-01-01')
    await store.getState().addDayRecord(cycleId, '2026-01-14', 14, { monitor: 'peak' })
    await store.getState().updateSettings({ goal: 'achieve-pregnancy' })
    await store.getState().clearAllData()
    const s = state(store)
    expect(s.cycles).toEqual([])
    expect(s.dayRecords).toEqual([])
    expect(s.output?.cycles).toEqual([])
    expect(s.settings.goal).toBe('track-only')
  })
})