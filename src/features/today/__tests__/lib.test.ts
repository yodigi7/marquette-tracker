import { describe, expect, it } from 'vitest'
import { BEGIN_RULE_LABELS, END_RULE_LABELS, STATUS_LABELS, dayInCycle, todayKey, windowDescription } from '../lib'

describe('lib', () => {
  it('todayKey produces a local YYYY-MM-DD for the injected clock', () => {
    expect(todayKey(new Date(2026, 0, 15))).toBe('2026-01-15')
    expect(todayKey(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31')
    expect(todayKey(new Date(2026, 2, 3, 4, 5))).toBe('2026-03-03')
  })

  it('dayInCycle counts from day1 inclusively', () => {
    expect(dayInCycle('2026-01-01', '2026-01-01')).toBe(1)
    expect(dayInCycle('2026-01-01', '2026-01-14')).toBe(14)
    expect(dayInCycle('2026-12-30', '2027-01-02')).toBe(4)
  })

  it('maps every DayStatus to a label', () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([
      'fertile',
      'post-calendar',
      'post-peak',
      'pre-fertile',
    ])
  })

  it('describes windows with the rule that fired', () => {
    const window = {
      begin: 6,
      end: 17,
      beginRule: 'calendar-day-6' as const,
      endRule: 'current-peak-plus-n' as const,
    }
    expect(windowDescription(window, true)).toContain('cycle day 6')
    expect(windowDescription(window, true)).toContain('until day 17')
    expect(windowDescription({ ...window, end: null }, false)).toContain('end unknown')
    expect(windowDescription({ ...window, end: null }, true)).toContain('pending')
  })

  it('exposes rule phrasing maps covering the engine unions', () => {
    expect(Object.keys(BEGIN_RULE_LABELS).sort()).toEqual([
      'calendar-day-6',
      'calendar-earliest-peak-minus-6',
      'first-high-or-peak',
    ])
    expect(Object.keys(END_RULE_LABELS).sort()).toEqual([
      'current-peak-plus-n',
      'earliest-end',
      'historic-peak-plus-n',
      'none',
    ])
  })
})