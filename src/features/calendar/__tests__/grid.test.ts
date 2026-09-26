import { describe, expect, it } from 'vitest'
import { monthGrid, monthTitle, resolveCell, shiftMonth, weekdayLabels } from '../grid'
import type { CycleEntity, DayRecordEntity } from '@/core/store/entities'
import type { CycleResult } from '@/core/engine/types'

const CYCLE: CycleEntity = {
  id: 'c1',
  cycleNo: 1,
  day1: '2026-08-03',
  closedAt: null,
  notes: '',
  version: 1,
  synced: false,
  createdAt: '',
  updatedAt: '',
}

const RESULT: CycleResult = {
  cycleId: 'c1',
  cycleNo: 1,
  day1: '2026-08-03',
  length: null,
  peakDay: null,
  peakSource: 'none',
  fertileWindow: {
    begin: 6,
    end: null,
    beginRule: 'calendar-day-6',
    endRule: 'none',
  },
  days: [],
  warnings: [],
}

/** Peak on day 12 with the default 4-day interval: window 6-16, then post-peak. */
const PEAKED_RESULT: CycleResult = {
  ...RESULT,
  peakDay: 12,
  peakSource: 'monitor',
  fertileWindow: {
    begin: 6,
    end: 16,
    beginRule: 'calendar-day-6',
    endRule: 'current-peak-plus-n',
  },
}

const NO_RECORDS: DayRecordEntity[] = []

describe('monthGrid', () => {
  it('starts Monday-first and spans exactly the month', () => {
    const grid = monthGrid(2026, 7)
    expect(grid.weeks).toHaveLength(6)
    expect(grid.weeks[0][0]).toBe('')
    expect(grid.weeks[0][5]).toBe('2026-08-01')
    expect(grid.weeks[0][6]).toBe('2026-08-02')
    expect(grid.weeks[1][0]).toBe('2026-08-03')
    expect(grid.weeks[4][6]).toBe('2026-08-30')
    expect(grid.weeks[5][0]).toBe('2026-08-31')
    expect(grid.weeks[5][6]).toBe('')
  })

  it('shiftMonth ranges across years', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })

  it('labels the month title', () => {
    expect(monthTitle(2026, 7)).toBe('August 2026')
  })

  describe('week-start variants', () => {
    it('defaults to Monday-first and labels Mo…Su', () => {
      expect(weekdayLabels()).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])
      const grid = monthGrid(2026, 7)
      expect(grid.weeks[0][0]).toBe('')
      expect(grid.weeks[0][5]).toBe('2026-08-01')
    })

    it('sunday-first: the 1st sits in the trailing slot of week 0, Sep 1 blanked after Aug 31', () => {
      expect(weekdayLabels('sunday')).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])
      const grid = monthGrid(2026, 7, 'sunday')
      // Aug 1 2026 is a Saturday → Sunday grid opens 6 days earlier (Jul 26, blanked).
      expect(grid.weeks[0][0]).toBe('')
      expect(grid.weeks[0][6]).toBe('2026-08-01')
      expect(grid.weeks[1][0]).toBe('2026-08-02')
      expect(grid.weeks[5][0]).toBe('2026-08-30')
      expect(grid.weeks[5][1]).toBe('2026-08-31')
      expect(grid.weeks[5][2]).toBe('')
    })
  })
})

describe('resolveCell', () => {
  const results = new Map<string, CycleResult>([['c1', RESULT]])
  const today = '2026-12-31'

  it('shades recorded days and flags day 1 as menses', () => {
    const recorded: DayRecordEntity[] = [
      {
        id: 'r1',
        cycleId: 'c1',
        date: '2026-08-08',
        dayInCycle: 6,
        version: 1,
        synced: false,
        createdAt: '',
        updatedAt: '',
      },
    ]
    const fertile = resolveCell([CYCLE], recorded, results, undefined, '2026-08-08', today)
    expect(fertile.info).toBe('fertile')

    const day1 = resolveCell([CYCLE], recorded, results, undefined, '2026-08-03', today)
    expect(day1.menses).toBe(true)
  })

  it('derives a status for unrecorded days inside the window', () => {
    const cell = resolveCell([CYCLE], NO_RECORDS, results, undefined, '2026-08-08', today)
    expect(cell.info).toBe('fertile')
  })

  it('derives post-Peak fertile days and post-window days with no records at all', () => {
    const peaked = new Map<string, CycleResult>([['c1', PEAKED_RESULT]])
    // Only the Peak day itself is recorded; 13-16 and 17+ hold nothing.
    const onlyPeak: DayRecordEntity[] = [
      {
        id: 'r-peak',
        cycleId: 'c1',
        date: '2026-08-14',
        dayInCycle: 12,
        monitor: 'peak',
        version: 1,
        synced: false,
        createdAt: '',
        updatedAt: '',
      },
    ]

    for (const dayInCycle of [13, 14, 15, 16]) {
      const date = `2026-08-${String(2 + dayInCycle).padStart(2, '0')}`
      const cell = resolveCell([CYCLE], onlyPeak, peaked, undefined, date, today)
      expect(cell.info, `day ${dayInCycle}`).toBe('fertile')
    }

    const after = resolveCell([CYCLE], onlyPeak, peaked, undefined, '2026-08-20', today)
    expect(after.info).toBe('post-peak')
  })

  it('scopes the forecast treatment to dates after today', () => {
    // The range deliberately covers past, present, and future dates.
    const forecast = { begin: '2026-08-01', end: '2026-08-20' }
    const at = '2026-08-10'

    expect(resolveCell([], NO_RECORDS, new Map(), forecast, '2026-08-05', at).forecast).toBe(false)
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, '2026-08-10', at).forecast).toBe(false)
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, '2026-08-11', at).forecast).toBe(true)
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, '2026-08-20', at).forecast).toBe(true)
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, '2026-08-25', at).forecast).toBe(false)
  })

  it('leaves before-first and beyond-closed days unshaded', () => {
    const before = resolveCell([CYCLE], NO_RECORDS, results, undefined, '2026-07-30', today)
    expect(before.info).toBeNull()

    const closed = { ...CYCLE, closedAt: '2026-08-28' }
    const beyond = resolveCell([closed], NO_RECORDS, results, undefined, '2026-09-01', today)
    expect(beyond.info).toBeNull()
  })

  it('shows the forecast ring only inside the forecast window', () => {
    const at = '2026-08-31'
    const forecast = { begin: '2026-09-01', end: '2026-09-14' }
    const inside = resolveCell([], NO_RECORDS, new Map(), forecast, '2026-09-07', at)
    expect(inside.info).toBeNull()
    expect(inside.forecast).toBe(true)

    const outside = resolveCell([], NO_RECORDS, new Map(), forecast, '2026-09-20', at)
    expect(outside.forecast).toBe(false)
  })

  it('reads monitor + blood flow from the day record', () => {
    const withRecord: DayRecordEntity[] = [
      {
        id: 'r1',
        cycleId: 'c1',
        date: '2026-08-08',
        dayInCycle: 6,
        monitor: 'high',
        bloodFlow: 'medium',
        version: 1,
        synced: false,
        createdAt: '',
        updatedAt: '',
      },
    ]
    const cell = resolveCell([CYCLE], withRecord, results, undefined, '2026-08-08', today)
    expect(cell.monitor).toBe('high')
    expect(cell.menses).toBe(true)
  })

  it('keeps future days blank (no status band) with only the forecast ring', () => {
    const today = '2026-08-05'
    const forecast = { begin: '2026-08-06', end: '2026-08-15' }

    const futureInWindow = resolveCell([CYCLE], NO_RECORDS, results, forecast, '2026-08-08', today)
    expect(futureInWindow.info).toBeNull()
    expect(futureInWindow.forecast).toBe(true)
    expect(futureInWindow.menses).toBe(false)

    const futureOutOfWindow = resolveCell([CYCLE], NO_RECORDS, results, forecast, '2026-08-20', today)
    expect(futureOutOfWindow.info).toBeNull()
    expect(futureOutOfWindow.forecast).toBe(false)

    const pastOutOfWindow = resolveCell([CYCLE], NO_RECORDS, results, forecast, '2026-08-04', today)
    // A past day inside the cycle keeps its derived status and no forecast cue.
    expect(pastOutOfWindow.info).toBe('pre-fertile')
    expect(pastOutOfWindow.forecast).toBe(false)

    const recordedFuture = resolveCell(
      [CYCLE],
      [
        {
          id: 'r9',
          cycleId: 'c1',
          date: '2026-08-08',
          dayInCycle: 6,
          version: 1,
          synced: false,
          createdAt: '',
          updatedAt: '',
        },
      ],
      results,
      forecast,
      '2026-08-08',
      today,
    )
    // Future dates never receive a derived status, and a record suppresses the
    // forecast ring.
    expect(recordedFuture.info).toBeNull()
    expect(recordedFuture.forecast).toBe(false)
  })

  it('flags a recorded intercourse act', () => {
    const withRecord: DayRecordEntity[] = [
      {
        id: 'r9',
        cycleId: 'c1',
        date: '2026-08-20',
        dayInCycle: 18,
        intercourse: true,
        version: 1,
        synced: false,
        createdAt: '',
        updatedAt: '',
      },
    ]
    const cell = resolveCell([CYCLE], withRecord, results, undefined, '2026-08-20', today)
    expect(cell.intercourse).toBe(true)

    const noRecord = resolveCell([CYCLE], NO_RECORDS, results, undefined, '2026-08-20', today)
    expect(noRecord.intercourse).toBe(false)
  })

  it('marks only the predicted ovulation day of the open cycle, in the present/future', () => {
    const day1 = '2026-08-03'
    const open = { ...CYCLE, day1 }
    // today = Aug 12 → predicted ovulation at day 14 = Aug 16 (future)
    const ovulationDay = '2026-08-16'
    const today = '2026-08-12'
    expect(resolveCell([open], NO_RECORDS, results, undefined, ovulationDay, today, 14).ovulation).toBe(true)
    // Other future days are not ovulation.
    expect(resolveCell([open], NO_RECORDS, results, undefined, '2026-08-17', today, 14).ovulation).toBe(false)
    // A past predicted-ovulation date (before today) is not marked.
    expect(resolveCell([open], NO_RECORDS, results, undefined, '2026-08-16', '2026-08-20', 14).ovulation).toBe(false)
  })
})