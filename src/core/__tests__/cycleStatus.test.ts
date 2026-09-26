import { describe, expect, it } from 'vitest'
import { dayInfo } from '../cycleStatus'
import type { FertileWindow } from '@/core/engine/types'

const calendarWindow: FertileWindow = {
  begin: 6,
  end: 17,
  beginRule: 'calendar-day-6',
  endRule: 'current-peak-plus-n',
}

describe('dayInfo', () => {
  it('classifies pre/mid/post days of the window', () => {
    expect(dayInfo(calendarWindow, true, 5)).toBe('pre-fertile')
    expect(dayInfo(calendarWindow, true, 6)).toBe('fertile')
    expect(dayInfo(calendarWindow, true, 17)).toBe('fertile')
    expect(dayInfo(calendarWindow, true, 18)).toBe('post-peak')
  })

  it('returns a bare status with no source field', () => {
    const openedEarly: FertileWindow = { ...calendarWindow, begin: 3, beginRule: 'first-high-or-peak' }
    expect(dayInfo(openedEarly, false, 4)).toBe('fertile')
    expect(dayInfo(calendarWindow, false, 18)).toBe('post-calendar')
  })

  it('open window without end stays fertile', () => {
    const open: FertileWindow = { ...calendarWindow, end: null, endRule: 'none' }
    expect(dayInfo(open, false, 40)).toBe('fertile')
  })
})
