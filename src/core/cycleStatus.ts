import type { DayStatus, FertileWindow } from '@/core/engine/types'

export interface DayInfo {
  status: DayStatus
  source: 'confirmed' | 'predicted'
}

/**
 * Status + source for a single cycle day.
 * Missing observations or calendar-derived edges classify as 'predicted';
 * anything resting on an actual Peak (or an early High that opened the window) is 'confirmed'.
 */
export function dayInfo(window: FertileWindow, peakKnown: boolean, day: number): DayInfo {
  if (day < window.begin) {
    return { status: 'pre-fertile', source: 'predicted' }
  }
  if (window.end === null || day <= window.end) {
    const confirmed = window.beginRule === 'first-high-or-peak'
    return { status: 'fertile', source: confirmed ? 'confirmed' : 'predicted' }
  }
  return { status: peakKnown ? 'post-peak' : 'post-calendar', source: peakKnown ? 'confirmed' : 'predicted' }
}