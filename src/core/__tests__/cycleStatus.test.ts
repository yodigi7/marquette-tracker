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
    expect(dayInfo(calendarWindow, true, 5)).toEqual({ status: 'pre-fertile', source: 'predicted' })
    expect(dayInfo(calendarWindow, true, 6)).toEqual({ status: 'fertile', source: 'predicted' })
    expect(dayInfo(calendarWindow, true, 17)).toEqual({ status: 'fertile', source: 'predicted' })
    expect(dayInfo(calendarWindow, true, 18)).toEqual({ status: 'post-peak', source: 'confirmed' })
  })

  it('calendar-range fertile is predicted; window opened by a reading is confirmed', () => {
    const openedEarly: FertileWindow = { ...calendarWindow, begin: 3, beginRule: 'first-high-or-peak' }
    expect(dayInfo(openedEarly, false, 4)).toEqual({ status: 'fertile', source: 'confirmed' })
    expect(dayInfo(calendarWindow, false, 18)).toEqual({ status: 'post-calendar', source: 'predicted' })
  })

  it('open window without end stays fertile and predicted', () => {
    const open: FertileWindow = { ...calendarWindow, end: null, endRule: 'none' }
    expect(dayInfo(open, false, 40)).toEqual({ status: 'fertile', source: 'predicted' })
  })
})