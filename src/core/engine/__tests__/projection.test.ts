// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { addDays } from '../dateUtils'
import { CYCLE_LENGTH_MAX, CYCLE_LENGTH_MIN, DEFAULT_HISTORY_WINDOW, DEFAULT_POST_PEAK_DAYS } from '../marquette'
import { computeCycle } from '../marquette'
import { computePredictions } from '../predict'
import {
  estimateProjectedLength,
  PROTOCOL_DEFAULT_WINDOW_BEGIN,
  PROTOCOL_DEFAULT_WINDOW_END,
  projectCycles,
} from '../projection'
import type { CycleHistory, CycleResult, EngineSettings } from '../types'

// The canonical table from the spec: one atypical 45-day cycle that a mean
// would let dominate (31.2) and a median shrugs off (29).
const LENGTHS = [26, 28, 29, 29, 30, 45]

function settings(overrides: Partial<EngineSettings> = {}): EngineSettings {
  return {
    postPeakDays: DEFAULT_POST_PEAK_DAYS,
    historyWindow: DEFAULT_HISTORY_WINDOW,
    cycleMinLength: CYCLE_LENGTH_MIN,
    cycleMaxLength: CYCLE_LENGTH_MAX,
    ...overrides,
  }
}

function emptyHistory(): CycleHistory {
  return { peaksByCycle: [], cycleNos: [] }
}

function closedCycle(cycleNo: number, day1: string, length: number, peakDay: number | null): CycleResult {
  const records = []
  if (peakDay !== null) {
    records.push({
      id: `c${cycleNo}-peak`,
      cycleId: `c${cycleNo}`,
      date: addDays(day1, peakDay - 1),
      dayInCycle: peakDay,
      monitor: 'peak' as const,
    })
  }
  return computeCycle({ id: `c${cycleNo}`, day1 }, records, cycleNo, length, emptyHistory(), settings(), day1)
}

function openCycle(cycleNo: number, day1: string, peakDay: number | null, today: string): CycleResult {
  const records = []
  if (peakDay !== null) {
    records.push({
      id: `c${cycleNo}-peak`,
      cycleId: `c${cycleNo}`,
      date: addDays(day1, peakDay - 1),
      dayInCycle: peakDay,
      monitor: 'peak' as const,
    })
  }
  return computeCycle({ id: `c${cycleNo}`, day1 }, records, cycleNo, null, emptyHistory(), settings(), today)
}

// Eight closed cycles, so the projection is past the protocol's six-cycle
// threshold and the calendar rule is the applicable branch. Peaks span
// 12..17 so the lookback window's min/max is 12/17.
const PEAKS = [12, 13, 16, 17, 12, 13, 16, 17]
const CLOSED_LENGTHS = [28, 28, 28, 28, 28, 28, 28, 28]

function eightClosedCycles(): CycleResult[] {
  const cycles: CycleResult[] = []
  let day1 = '2026-01-01'
  for (let i = 0; i < 8; i++) {
    cycles.push(closedCycle(i + 1, day1, CLOSED_LENGTHS[i], PEAKS[i]))
    day1 = addDays(day1, CLOSED_LENGTHS[i])
  }
  return cycles
}

const OPEN_DAY1 = '2026-09-01'
const TODAY = '2026-09-20'

describe('estimateProjectedLength', () => {
  it('uses the median of the lookback window, not the mean', () => {
    // mean would be 31.2; the spec pins 29.
    expect(estimateProjectedLength(LENGTHS, 1, 6)).toBe(29)
  })

  it('honours the configured history window as the lookback count', () => {
    // window 3 -> [29, 30, 45] -> median 30, not the 6-cycle median of 29.
    expect(estimateProjectedLength(LENGTHS, 1, 3)).toBe(30)
    expect(estimateProjectedLength(LENGTHS, 1, 6)).toBe(29)
  })

  it('returns null when there is no closed cycle', () => {
    expect(estimateProjectedLength([], 1, 6)).toBeNull()
  })

  it('conditions on cycles that could still be running', () => {
    // day 30 -> only 30 and 45 remain eligible -> median 37.5 -> 38.
    expect(estimateProjectedLength(LENGTHS, 30, 6)).toBe(38)
  })

  it('drops shorter prior cycles out as the cycle runs', () => {
    const conditioned = estimateProjectedLength(LENGTHS, 30, 6)
    const unconditioned = estimateProjectedLength(LENGTHS, 1, 6)
    expect(conditioned).not.toBe(unconditioned)
    // the 26/28/29s no longer influence the result
    expect(conditioned).toBeGreaterThan(30)
  })

  it('does not produce an elapsed length for a late cycle', () => {
    const length = estimateProjectedLength(LENGTHS, 30, 6)
    expect(length).not.toBeNull()
    expect(length!).toBeGreaterThanOrEqual(30)
  })

  it('falls back to the unconditioned median below the two-sample floor', () => {
    // day 36 -> only 45 eligible (1 sample) -> fall back to the window median.
    expect(estimateProjectedLength(LENGTHS, 36, 6)).toBe(29)
  })

  it('rounds a fractional median to whole days', () => {
    // [30, 45] median is 37.5; a cycle length is a whole number of days.
    expect(estimateProjectedLength(LENGTHS, 30, 6)).toBe(38)
    expect(Number.isInteger(estimateProjectedLength(LENGTHS, 30, 6)!)).toBe(true)
  })

  it('treats a history window below one as one', () => {
    expect(estimateProjectedLength(LENGTHS, 1, 0)).toBe(45)
  })
})

describe('projectCycles chain', () => {
  it('gives the open cycle a projected length', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2026-10-31')

    expect(projected.length).toBeGreaterThan(0)
    // first link IS the open cycle, extended past today
    expect(projected[0].day1).toBe(OPEN_DAY1)
    expect(projected[0].length).toBe(28)
    // covers 1 Sep through 28 Sep inclusive
    const lastDay = projected[0].days[projected[0].days.length - 1]
    expect(lastDay.date).toBe('2026-09-28')
  })

  it('projects the open cycle tail past today', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2026-10-31')

    const tailDates = projected[0].days.filter((d) => d.date > TODAY)
    expect(tailDates.length).toBe(8) // 21 Sep .. 28 Sep
    expect(tailDates[0].date).toBe('2026-09-21')
  })

  it('starts the next projected cycle the day after the previous ends', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2026-12-31')

    expect(projected[1].day1).toBe('2026-09-29')
    expect(projected[0].length).toBe(28)
  })

  it('leaves no date outside every cycle', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const until = '2027-03-31'
    const projected = projectCycles(cycles, settings(), TODAY, until)

    const owner = new Map<string, number>()
    for (const cycle of projected) {
      for (const day of cycle.days) {
        owner.set(day.date, (owner.get(day.date) ?? 0) + 1)
      }
    }

    // walk every date from today to the horizon
    for (let date = TODAY; date <= until; date = addDays(date, 1)) {
      expect(owner.get(date), `unowned date ${date}`).toBe(1)
    }
  })

  it('never overlaps two projected cycles on one date', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2027-06-30')

    const seen = new Set<string>()
    for (const cycle of projected) {
      for (const day of cycle.days) {
        expect(seen.has(day.date), `overlap at ${day.date}`).toBe(false)
        seen.add(day.date)
      }
    }
  })

  it('continues past a single additional cycle with no fixed maximum', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    // three years out
    const projected = projectCycles(cycles, settings(), TODAY, '2029-09-30')
    expect(projected.length).toBeGreaterThan(30)
  })

  it('computes only as far as the caller asks', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const near = projectCycles(cycles, settings(), TODAY, '2026-10-15')
    const far = projectCycles(cycles, settings(), TODAY, '2028-01-01')
    expect(near.length).toBeLessThan(far.length)
  })

  it('produces nothing without a closed cycle', () => {
    const cycles = [openCycle(1, OPEN_DAY1, null, TODAY)]
    expect(projectCycles(cycles, settings(), TODAY, '2027-01-01')).toEqual([])
  })

  it('produces nothing when the newest cycle is already closed', () => {
    const cycles = eightClosedCycles()
    expect(projectCycles(cycles, settings(), TODAY, '2027-01-01')).toEqual([])
  })
})

describe('projectCycles protocol band ceiling', () => {
  // Open cycle day 42 is 2026-10-12, day 43 is 2026-10-13.
  const DAY_42 = '2026-10-12'
  const DAY_43 = '2026-10-13'

  it('stops once the open cycle is at or beyond the maximum length', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_43)]
    expect(projectCycles(cycles, settings(), DAY_43, '2027-06-30')).toEqual([])
  })

  it('still projects on the last day inside the ceiling', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_42)]
    const projected = projectCycles(cycles, settings(), DAY_42, '2027-01-31')
    expect(projected.length).toBeGreaterThan(0)
    // no closed cycle reached 42 days, so the sample is too thin to condition on
    expect(projected[0].length).toBeGreaterThanOrEqual(42)
  })

  it('never projects a cycle end before today', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_42)]
    const projected = projectCycles(cycles, settings(), DAY_42, '2027-01-31')
    const first = projected[0]
    const lastDate = first.days[first.days.length - 1].date
    expect(lastDate >= DAY_42).toBe(true)
  })

  it('never lets a thin sample end the open cycle before today', () => {
    // all closed cycles are short, so conditioning has nothing eligible
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_42)]
    const projected = projectCycles(cycles, settings(), DAY_42, '2027-01-31')
    expect(projected[0].length).toBeGreaterThanOrEqual(42)
  })
})

describe('projectCycles fertile window', () => {
  it('brackets the historical Peak range via the calendar rule', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2026-10-31')

    // lookback min peak 12 -> begin 6; max peak 17 + 4 -> end 21
    expect(projected[0].fertileWindow.begin).toBe(6)
    expect(projected[0].fertileWindow.end).toBe(21)
  })

  it('moves the window end with a configured post-Peak value', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings({ postPeakDays: 6 }), TODAY, '2026-10-31')
    expect(projected[0].fertileWindow.end).toBe(23)
  })

  it('gives a projected cycle no Peak evidence and no ovulation point estimate', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2026-10-31')

    for (const cycle of projected) {
      expect(cycle.peakDay).toBeNull()
      expect(cycle.peakSource).toBe('none')
    }
  })

  it('paints post-window days as after the window, not fertile to the cycle end', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2026-10-31')

    const first = projected[0]
    expect(first.fertileWindow.end).toBe(21)
    const day22 = first.days.find((d) => d.day === 22)!
    expect(day22.status).not.toBe('fertile')
  })

  it('falls back to the protocol default band when no Peak history exists', () => {    // closed cycles but the user never logged a monitor Peak
    const noPeaks: CycleResult[] = []
    let day1 = '2026-01-01'
    for (let i = 0; i < 8; i++) {
      noPeaks.push(closedCycle(i + 1, day1, 28, null))
      day1 = addDays(day1, 28)
    }
    noPeaks.push(openCycle(9, OPEN_DAY1, null, TODAY))

    const projected = projectCycles(noPeaks, settings(), TODAY, '2026-10-31')
    expect(projected.length).toBeGreaterThan(0)
    // the protocol's standard first-cycle band, pinned exactly: these are
    // exported constants, so assert the values rather than just "bounded"
    expect(projected[0].fertileWindow).toMatchObject({
      begin: PROTOCOL_DEFAULT_WINDOW_BEGIN,
      end: PROTOCOL_DEFAULT_WINDOW_END,
      endRule: 'protocol-default-band',
    })
    // bounded band, not fertile to the end of the cycle
    expect(projected[0].fertileWindow.end).not.toBeNull()
    expect(projected[0].fertileWindow.end!).toBeLessThan(projected[0].length!)
    // days past the default band are no longer painted fertile
    const day22 = projected[0].days.find((d) => d.day === PROTOCOL_DEFAULT_WINDOW_END + 1)
    expect(day22?.status).not.toBe('fertile')
  })
})

describe('the bounded fallback does not reach recorded cycles', () => {
  it('leaves a recorded cycle with no Peak history on an open window', () => {
    // cycles exist, so the projection runs...
    const cycles: CycleResult[] = []
    let day1 = '2026-01-01'
    for (let i = 0; i < 8; i++) {
      cycles.push(closedCycle(i + 1, day1, 28, null))
      day1 = addDays(day1, 28)
    }
    const open = openCycle(9, OPEN_DAY1, null, TODAY)
    cycles.push(open)

    // ...but the recorded results handed in are returned untouched
    const before = cycles.map((c) => ({ ...c.fertileWindow }))
    const projected = projectCycles(cycles, settings(), TODAY, '2026-10-31')
    expect(projected.length).toBeGreaterThan(0)

    cycles.forEach((cycle, index) => {
      expect(cycle.fertileWindow).toEqual(before[index])
      expect(cycle.fertileWindow.end).toBeNull()
      expect(cycle.fertileWindow.endRule).toBe('none')
    })
  })
})

describe('projection and forecast agree', () => {
  it('reports the same next period start as the History forecast', () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)]
    const projected = projectCycles(cycles, settings(), TODAY, '2026-12-31')
    const forecast = computePredictions(cycles, settings(), TODAY)

    const first = projected[0]
    const firstLastDay = first.days[first.days.length - 1].date
    // the day after the projected tail is where the next cycle starts
    expect(addDays(firstLastDay, 1)).toBe(forecast!.expectedPeriodStart)
  })

  it('agrees for a late cycle where a mean would have gone backwards', () => {
    const cycles = [
      closedCycle(1, '2026-01-01', 26, 12),
      closedCycle(2, '2026-01-27', 28, 13),
      closedCycle(3, '2026-02-24', 29, 16),
      closedCycle(4, '2026-03-25', 29, 17),
      closedCycle(5, '2026-04-23', 30, 12),
      closedCycle(6, '2026-05-23', 45, 13),
      closedCycle(7, '2026-07-07', 28, 16),
      closedCycle(8, '2026-08-04', 28, 17),
      openCycle(9, '2026-09-01', null, TODAY),
    ]
    const projected = projectCycles(cycles, settings(), TODAY, '2027-03-31')
    const forecast = computePredictions(cycles, settings(), TODAY)

    const first = projected[0]
    const firstLastDay = first.days[first.days.length - 1].date
    expect(addDays(firstLastDay, 1)).toBe(forecast!.expectedPeriodStart)
    // the mean would have produced a date already in the past
    expect(forecast!.expectedPeriodStart > TODAY).toBe(true)
  })
})
