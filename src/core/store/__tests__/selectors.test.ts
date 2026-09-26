// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { addDays, diffDays } from '@/core/engine/dateUtils'
import { computeAll } from '@/core/engine/engineSdk'
import type { CycleInput, DayRecordInput, EngineSettings } from '@/core/engine/types'
import { DEFAULT_SETTINGS, type SettingsEntity } from '../entities'
import { engineSettingsOf, projectedCyclesThrough } from '../selectors'

const TODAY = '2026-09-20'
const OPEN_DAY1 = '2026-09-01'

function settings(overrides: Partial<SettingsEntity> = {}): SettingsEntity {
  return {
    ...DEFAULT_SETTINGS,
    version: 1,
    synced: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function engineSettings(): EngineSettings {
  return engineSettingsOf(settings())
}

/** Eight closed 28-day cycles with a monitor Peak, then one open cycle. */
function fixture(): { cycles: CycleInput[]; dayRecords: DayRecordInput[] } {
  const cycles: CycleInput[] = []
  const dayRecords: DayRecordInput[] = []
  let day1 = '2026-01-01'
  for (let i = 0; i < 8; i++) {
    const id = `c${i + 1}`
    cycles.push({ id, day1 })
    dayRecords.push({
      id: `${id}-peak`,
      cycleId: id,
      date: addDays(day1, 11),
      dayInCycle: 12,
      monitor: 'peak',
    })
    day1 = addDays(day1, 28)
  }
  cycles.push({ id: 'open', day1: OPEN_DAY1 })
  return { cycles, dayRecords }
}

function outputFor(cycleCount = 9) {
  const { cycles, dayRecords } = fixture()
  return computeAll(cycles.slice(0, cycleCount), dayRecords.filter((r) => {
    const owner = cycles.find((c) => c.id === r.cycleId)
    return owner !== undefined
  }), engineSettings(), TODAY)
}

describe('projectedCyclesThrough', () => {
  it('returns nothing when the setting is off', () => {
    const output = outputFor()
    expect(projectedCyclesThrough(output, settings({ projectFutureCycles: false }), TODAY, '2027-01-31')).toEqual([])
  })

  it('returns nothing when there is no engine output', () => {
    expect(projectedCyclesThrough(null, settings({ projectFutureCycles: true }), TODAY, '2027-01-31')).toEqual([])
  })

  it('returns projected cycles when the setting is on', () => {
    const output = outputFor()
    const projected = projectedCyclesThrough(output, settings({ projectFutureCycles: true }), TODAY, '2027-01-31')
    expect(projected.length).toBeGreaterThan(0)
    expect(projected[0].day1).toBe(OPEN_DAY1)
  })

  it('bounds the returned range by the requested date', () => {
    const output = outputFor()
    const near = projectedCyclesThrough(output, settings({ projectFutureCycles: true }), TODAY, '2026-10-15')
    const far = projectedCyclesThrough(output, settings({ projectFutureCycles: true }), TODAY, '2028-01-01')

    expect(near.length).toBeLessThan(far.length)
    // every returned cycle starts at or before the requested date
    for (const cycle of near) {
      expect(cycle.day1 <= '2026-10-15').toBe(true)
    }
  })

  it('follows the chain as far as the caller pages, with no fixed cap', () => {
    const output = outputFor()
    const far = projectedCyclesThrough(output, settings({ projectFutureCycles: true }), TODAY, '2029-09-30')
    expect(far.length).toBeGreaterThan(30)
  })

  it('leaves every real cycle and record untouched', () => {
    const { cycles, dayRecords } = fixture()
    const output = computeAll(cycles, dayRecords, engineSettings(), TODAY)
    const before = { cycles: output.cycles.length, records: dayRecords.length }

    projectedCyclesThrough(output, settings({ projectFutureCycles: true }), TODAY, '2028-01-01')

    const after = computeAll(cycles, dayRecords, engineSettings(), TODAY)
    expect(after.cycles).toHaveLength(before.cycles)
    expect(dayRecords).toHaveLength(before.records)
  })

  it('never adds a projected cycle to the engine output', () => {
    const { cycles, dayRecords } = fixture()
    const output = computeAll(cycles, dayRecords, engineSettings(), TODAY)
    const realIds = new Set(output.cycles.map((c) => c.cycleId))

    const projected = projectedCyclesThrough(output, settings({ projectFutureCycles: true }), TODAY, '2027-06-30')
    for (const cycle of projected) {
      expect(realIds.has(cycle.cycleId)).toBe(false)
    }
  })

  it('starts the chain where the open cycle ends, leaving no gap', () => {
    const output = outputFor()
    const projected = projectedCyclesThrough(output, settings({ projectFutureCycles: true }), TODAY, '2027-01-31')

    const first = projected[0]
    const firstLastDay = first.days[first.days.length - 1].date
    expect(projected[1].day1).toBe(addDays(firstLastDay, 1))
    // the open cycle's tail is covered, not skipped
    expect(diffDays(TODAY, firstLastDay)).toBeGreaterThan(0)
  })
})

describe('projection retention', () => {
  it('recomputes from the same records on every read and retains nothing', () => {
    const { cycles, dayRecords } = fixture()
    const settingsOn = settings({ projectFutureCycles: true })
    const output = computeAll(cycles, dayRecords, engineSettings(), TODAY)

    const first = projectedCyclesThrough(output, settingsOn, TODAY, '2027-06-30')
    const second = projectedCyclesThrough(output, settingsOn, TODAY, '2027-06-30')

    // deterministic: the same inputs produce the same result, not a replay
    expect(second).toEqual(first)
    // and each call builds fresh arrays rather than handing back a cached one
    expect(second).not.toBe(first)

    // nothing was written: the store's own derivation is unchanged, and no
    // projected id or date has leaked into the real cycles
    const after = computeAll(cycles, dayRecords, engineSettings(), TODAY)
    expect(after.cycles.map((c) => c.cycleId)).toEqual(output.cycles.map((c) => c.cycleId))
    expect(dayRecords).toHaveLength(8)
    for (const projected of first) {
      expect(output.cycles.some((c) => c.cycleId === projected.cycleId)).toBe(false)
    }
  })

  it('is unaffected by how many times it has already run', () => {
    const { cycles, dayRecords } = fixture()
    const output = computeAll(cycles, dayRecords, engineSettings(), TODAY)
    const settingsOn = settings({ projectFutureCycles: true })

    const first = projectedCyclesThrough(output, settingsOn, TODAY, '2027-06-30')
    projectedCyclesThrough(output, settingsOn, TODAY, '2026-10-31')
    projectedCyclesThrough(output, settingsOn, TODAY, '2028-12-31')
    const later = projectedCyclesThrough(output, settingsOn, TODAY, '2027-06-30')

    expect(later).toEqual(first)
  })
})
