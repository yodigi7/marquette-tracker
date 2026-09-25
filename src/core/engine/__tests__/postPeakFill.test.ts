import { describe, expect, it } from 'vitest'
import { addDays } from '../dateUtils'
import { computeCycle } from '../marquette'
import { planPostPeakFill, type PostPeakFillCycle, type PostPeakFillDay, type PostPeakFillInput } from '../postPeakFill'
import type { DataOrigin, EngineSettings, MonitorReading, PostPeakFillMode, PostPeakSuppression } from '../types'

const BASE = '2026-01-01'
const POST_PEAK_DAYS = 4
const PEAK_DAY = 14
/** First eligible generated day with the four-day default. */
const TAIL_START = PEAK_DAY + POST_PEAK_DAYS + 1

function dateForCycleDay(dayInCycle: number): string {
  return addDays(BASE, dayInCycle - 1)
}

function record(
  dayInCycle: number,
  monitor?: MonitorReading,
  dataOrigin?: DataOrigin,
  id = `r${dayInCycle}`,
  overrides: Partial<PostPeakFillDay> = {},
): PostPeakFillDay {
  return {
    id,
    cycleId: 'c1',
    date: dateForCycleDay(dayInCycle),
    dayInCycle,
    monitor,
    dataOrigin,
    ...overrides,
  }
}

function cycle(overrides: Partial<PostPeakFillCycle> = {}): PostPeakFillCycle {
  return {
    id: 'c1',
    day1: BASE,
    nextDay1: null,
    monitorPeakDay: PEAK_DAY,
    ...overrides,
  }
}

function suppression(date: string, overrides: Partial<PostPeakSuppression> = {}): PostPeakSuppression {
  return {
    date,
    cycleId: 'c1',
    cycleDay1: BASE,
    peakDay: PEAK_DAY,
    postPeakDays: POST_PEAK_DAYS,
    mode: 'auto-after-window',
    ...overrides,
  }
}

function input(overrides: Partial<PostPeakFillInput> = {}): PostPeakFillInput {
  return {
    cycles: [cycle()],
    records: [],
    mode: 'auto-after-window',
    postPeakDays: POST_PEAK_DAYS,
    today: dateForCycleDay(30),
    suppressions: [],
    ...overrides,
  }
}

describe('planPostPeakFill', () => {
  const cases: Array<{
    name: string
    input: PostPeakFillInput
    expected: string[]
    staleIds?: string[]
  }> = [
    {
      name: 'automatic mode starts on P+5 with the four-day default',
      input: input(),
      expected: Array.from({ length: 12 }, (_, index) => dateForCycleDay(TAIL_START + index)),
    },
    {
      name: 'user-anchor mode begins only after the first qualifying user Low',
      input: input({
        mode: 'after-user-low' as PostPeakFillMode,
        records: [record(TAIL_START, 'low', 'user')],
        today: dateForCycleDay(TAIL_START + 2),
      }),
      expected: [dateForCycleDay(TAIL_START + 1), dateForCycleDay(TAIL_START + 2)],
    },
    {
      name: 'a Low inside the fertile window does not seed user-anchor mode',
      input: input({
        mode: 'after-user-low' as PostPeakFillMode,
        records: [record(10, 'low', 'user')],
      }),
      expected: [],
    },
    {
      name: 'generated records cannot seed user-anchor mode',
      input: input({
        mode: 'after-user-low' as PostPeakFillMode,
        records: [record(TAIL_START, 'low', 'inferred')],
      }),
      expected: [],
    },
    {
      name: 'open cycle generation stops at today',
      input: input({ today: dateForCycleDay(TAIL_START + 2) }),
      expected: [dateForCycleDay(TAIL_START), dateForCycleDay(TAIL_START + 1), dateForCycleDay(TAIL_START + 2)],
    },
    {
      name: 'older cycle generation stops before the next Menses day',
      input: input({ cycles: [cycle({ nextDay1: dateForCycleDay(TAIL_START + 3) })], today: dateForCycleDay(30) }),
      expected: [dateForCycleDay(TAIL_START), dateForCycleDay(TAIL_START + 1), dateForCycleDay(TAIL_START + 2)],
    },
    {
      name: 'existing user records are not overwritten by generated records',
      input: input({ records: [record(TAIL_START, 'low', 'user', 'user-low')], today: dateForCycleDay(TAIL_START + 2) }),
      expected: [dateForCycleDay(TAIL_START + 1), dateForCycleDay(TAIL_START + 2)],
    },
    {
      name: 'active deletion suppression leaves its date blank',
      input: input({
        suppressions: [suppression(dateForCycleDay(TAIL_START + 2))],
        today: dateForCycleDay(TAIL_START + 4),
      }),
      expected: [
        dateForCycleDay(TAIL_START),
        dateForCycleDay(TAIL_START + 1),
        dateForCycleDay(TAIL_START + 3),
        dateForCycleDay(TAIL_START + 4),
      ],
    },
    {
      name: 'obsolete deletion suppression does not block a changed window',
      input: input({
        suppressions: [suppression(dateForCycleDay(TAIL_START + 2), { peakDay: 13 })],
        today: dateForCycleDay(TAIL_START + 4),
      }),
      expected: Array.from({ length: 5 }, (_, index) => dateForCycleDay(TAIL_START + index)),
    },
  ]

  for (const testCase of cases) {
    it(testCase.name, () => {
      const result = planPostPeakFill(testCase.input)
      expect(result.generated.map((item) => item.date)).toEqual(testCase.expected)
      if (testCase.staleIds) {
        expect(result.staleIds).toEqual(testCase.staleIds)
      }
    })
  }

  it('caps each post-Peak window at 30 generated records and removes stale generated rows', () => {
    const existing = Array.from({ length: 31 }, (_, index) =>
      record(TAIL_START + index, 'low', 'inferred', `generated-${index + 1}`),
    )
    const result = planPostPeakFill(
      input({
        records: existing,
        today: dateForCycleDay(TAIL_START + 42),
      }),
    )

    expect(result.generated).toHaveLength(30)
    expect(result.generated[0].date).toBe(dateForCycleDay(TAIL_START))
    expect(result.generated[29].date).toBe(dateForCycleDay(TAIL_START + 29))
    expect(result.staleIds).toEqual(['generated-31'])
  })

  it('starts a new cap when the post-Peak window changes', () => {
    const oldGenerated = [record(TAIL_START, 'low', 'inferred', 'old')]
    const result = planPostPeakFill(
      input({
        cycles: [cycle({ monitorPeakDay: 20 })],
        records: oldGenerated,
        today: dateForCycleDay(26),
      }),
    )

    expect(result.generated.map((item) => item.date)).toEqual([
      dateForCycleDay(25),
      dateForCycleDay(26),
    ])
    expect(result.staleIds).toEqual(['old'])
  })

  it('uses the configured tail boundary while preserving an earlier historical engine end', () => {
    const settings: EngineSettings = {
      postPeakDays: POST_PEAK_DAYS,
      historyWindow: 6,
      cycleMinLength: 21,
      cycleMaxLength: 42,
    }

    const plan = planPostPeakFill(
      input({
        today: dateForCycleDay(TAIL_START + 2),
      }),
    )
    expect(plan.generated.map((item) => item.date)).toEqual([
      dateForCycleDay(TAIL_START),
      dateForCycleDay(TAIL_START + 1),
      dateForCycleDay(TAIL_START + 2),
    ])

    const engineResult = computeCycle(
      { id: 'c1', day1: BASE },
      [record(PEAK_DAY, 'peak'), record(TAIL_START, 'low', 'inferred')],
      7,
      null,
      { peaksByCycle: [10], cycleNos: [6] },
      settings,
    )
    expect(engineResult.fertileWindow.end).toBe(14)
    expect(engineResult.fertileWindow.endRule).toBe('earliest-end')
    expect(engineResult.days.find((day) => day.day === TAIL_START)?.status).toBe('post-peak')
  })

  it('does nothing when the cycle has no monitor Peak', () => {
    const result = planPostPeakFill(input({ cycles: [cycle({ monitorPeakDay: null })] }))
    expect(result.generated).toEqual([])
    expect(result.staleIds).toEqual([])
  })

  it('does not anchor a tail on a mucus Peak', () => {
    const result = planPostPeakFill(
      input({
        cycles: [cycle({ monitorPeakDay: null })],
        records: [record(18, undefined, 'user', 'mucus-peak', { mucus: 'peak' })],
      }),
    )
    expect(result.generated).toEqual([])
  })

  it('stops the tail at a user-entered monitor High on or after the tail start', () => {
    const result = planPostPeakFill(
      input({
        records: [record(TAIL_START + 2, 'high', 'user', 'user-high')],
        today: dateForCycleDay(TAIL_START + 6),
      }),
    )

    expect(result.generated.map((item) => item.date)).toEqual([
      dateForCycleDay(TAIL_START),
      dateForCycleDay(TAIL_START + 1),
    ])
  })

  it('does not stop the tail for a user monitor High before the tail start', () => {
    const result = planPostPeakFill(
      input({
        records: [record(PEAK_DAY + 1, 'high', 'user', 'user-high')],
        today: dateForCycleDay(TAIL_START + 2),
      }),
    )

    expect(result.generated.map((item) => item.date)).toEqual([
      dateForCycleDay(TAIL_START),
      dateForCycleDay(TAIL_START + 1),
      dateForCycleDay(TAIL_START + 2),
    ])
  })

  it('does not stop the tail for mucus or other non-monitor user data', () => {
    const result = planPostPeakFill(
      input({
        records: [
          record(TAIL_START + 2, undefined, 'user', 'mucus', { mucus: 'peak' }),
          record(TAIL_START + 3, undefined, 'user', 'mucus-high', { mucus: 'high' }),
        ],
        today: dateForCycleDay(TAIL_START + 4),
      }),
    )

    expect(result.generated.map((item) => item.date)).toEqual([
      dateForCycleDay(TAIL_START),
      dateForCycleDay(TAIL_START + 1),
      dateForCycleDay(TAIL_START + 4),
    ])
  })

  it('invalidates generated rows after a High stops the tail', () => {
    const existing = [
      record(TAIL_START, 'low', 'inferred', 'gen-1'),
      record(TAIL_START + 1, 'low', 'inferred', 'gen-2'),
      record(TAIL_START + 2, 'low', 'inferred', 'gen-3'),
    ]
    const result = planPostPeakFill(
      input({
        records: [...existing, record(TAIL_START + 1, 'high', 'user', 'user-high')],
        today: dateForCycleDay(TAIL_START + 4),
      }),
    )

    expect(result.generated.map((item) => item.date)).toEqual([dateForCycleDay(TAIL_START)])
    expect(result.staleIds).toEqual(['gen-2', 'gen-3'])
  })

  it('restarts a fresh window and budget from a later monitor Peak', () => {
    const laterPeakDay = TAIL_START + 3
    const existing = Array.from({ length: 30 }, (_, index) =>
      record(TAIL_START + index, 'low', 'inferred', `gen-${index + 1}`),
    )
    const result = planPostPeakFill(
      input({
        cycles: [cycle({ monitorPeakDay: laterPeakDay })],
        records: [...existing, record(laterPeakDay, 'peak', 'user', 'user-peak')],
        today: dateForCycleDay(laterPeakDay + POST_PEAK_DAYS + 2),
      }),
    )

    const freshStart = laterPeakDay + POST_PEAK_DAYS + 1
    expect(result.generated.map((item) => item.date)).toEqual([dateForCycleDay(freshStart), dateForCycleDay(freshStart + 1)])
    expect(result.generated.every((item) => item.dayInCycle >= freshStart)).toBe(true)
    for (const row of existing.filter((item) => item.dayInCycle < freshStart)) {
      expect(result.staleIds).toContain(row.id)
    }
    expect(result.staleIds).not.toContain('user-peak')
    expect(result.generated[0].inference.peakDay).toBe(laterPeakDay)
  })

  it('bounds user-anchor mode by the same High stop', () => {
    const result = planPostPeakFill(
      input({
        mode: 'after-user-low' as PostPeakFillMode,
        records: [
          record(TAIL_START, 'low', 'user', 'anchor'),
          record(TAIL_START + 2, 'high', 'user', 'user-high'),
        ],
        today: dateForCycleDay(TAIL_START + 5),
      }),
    )

    expect(result.generated.map((item) => item.date)).toEqual([dateForCycleDay(TAIL_START + 1)])
  })

  it('never generates past a High that lands on the tail start', () => {
    const result = planPostPeakFill(
      input({
        records: [record(TAIL_START, 'high', 'user', 'user-high')],
        today: dateForCycleDay(TAIL_START + 3),
      }),
    )

    expect(result.generated).toEqual([])
  })
})
