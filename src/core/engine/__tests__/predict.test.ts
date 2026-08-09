// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { addDays } from '../dateUtils'
import { computeCycle } from '../marquette'
import { computePredictions } from '../predict'
import type { CycleHistory, CycleInput, CycleResult, DayRecordInput, EngineSettings } from '../types'

function settings(): EngineSettings {
  return { postPeakDays: 3, historyWindow: 6 }
}

function emptyHistory(): CycleHistory {
  return { peaksByCycle: [], cycleNos: [] }
}

function result(
  cycleNo: number,
  day1: string,
  length: number | null,
  peakDay: number | null,
): CycleResult {
  const start = '2026-01-01'
  const records: DayRecordInput[] = []
  if (peakDay !== null) {
    for (let day = 1; day <= peakDay; day++) {
      records.push({
        id: `c${cycleNo}-d${day}`,
        cycleId: `c${cycleNo}`,
        date: addDays(start, day - 1),
        dayInCycle: day,
        monitor: day === peakDay ? 'peak' : 'low',
      })
    }
  } else {
    records.push({
      id: `c${cycleNo}-d`,
      cycleId: `c${cycleNo}`,
      date: addDays(start, 5),
      dayInCycle: 6,
      monitor: 'high',
    })
  }
  const cycle: CycleInput = { id: `c${cycleNo}`, day1 }
  return computeCycle(cycle, records, cycleNo, length, emptyHistory(), settings())
}

describe('predict computePredictions', () => {
  it('returns null without any closed cycles', () => {
    expect(computePredictions([], settings())).toBeNull()
  })

  it('computes mean, median, min/max of cycle lengths (fixture 26,28,27,30,29)', () => {
    const cycles = [
      result(1, '2026-01-01', 26, 14),
      result(2, '2026-01-27', 28, 15),
      result(3, '2026-02-24', 27, 13),
      result(4, '2026-03-23', 30, 16),
      result(5, '2026-04-22', 29, 14),
    ]
    const forecast = computePredictions(cycles, settings())
    expect(forecast).not.toBeNull()
    expect(forecast!.meanLength).toBe(28)
    expect(forecast!.medianLength).toBe(28)
    expect(forecast!.earliestLength).toBe(26)
    expect(forecast!.latestLength).toBe(30)
    expect(forecast!.basedOnCycles).toBe(5)
    expect(forecast!.peakDayEarliest).toBe(13)
    expect(forecast!.peakDayLatest).toBe(16)
  })

  it('projects expected period start from the newest cycle day1 plus mean', () => {
    const cycles = [
      result(1, '2026-01-01', 28, 14),
      result(2, '2026-02-01', 28, 15),
    ]
    const forecast = computePredictions(cycles, settings())
    expect(forecast!.expectedPeriodStart).toBe('2026-03-01')
  })

  it('predicts the next fertile window via calendar rule (earliest peak -6 / latest +3)', () => {
    const cycles = [
      result(1, '2026-01-01', 28, 14),
      result(2, '2026-01-29', 28, 15),
      result(3, '2026-02-26', 28, 12),
      result(4, '2026-03-26', 30, 16),
    ]
    const forecast = computePredictions(cycles, settings())
    // Newest day1 = 2026-03-26; earliest peak 12 → begin day 6 → date 2026-03-31
    // latest peak 16 + 3 = 19 → date 2026-04-13
    expect(forecast!.nextFertileWindow.begin).toBe('2026-03-31')
    expect(forecast!.nextFertileWindow.end).toBe('2026-04-13')
  })

  it('counts out-of-band cycles', () => {
    const cycles = [
      result(1, '2026-01-01', 20, 10),
      result(2, '2026-01-21', 48, 20),
      result(3, '2026-03-10', 28, 14),
    ]
    const forecast = computePredictions(cycles, settings())
    expect(forecast!.outOfBandCount).toBe(2)
  })

  it('handles a single closed cycle', () => {
    const cycles = [result(1, '2026-01-01', 28, 14)]
    const forecast = computePredictions(cycles, settings())
    expect(forecast!.expectedPeriodStart).toBe('2026-01-29')
    expect(forecast!.nextFertileWindow.begin).toBe('2026-01-08')
    expect(forecast!.nextFertileWindow.end).toBe('2026-01-17')
  })
})