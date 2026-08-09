import type { DayStatus, FertileWindow } from '@/core/engine/types'

/** Local-calendar date key ('YYYY-MM-DD') for the given Date. */
export function dateKeyLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today's date key in the user's local calendar. */
export function todayKey(now: Date = new Date()): string {
  return dateKeyLocal(now)
}

export const STATUS_LABELS: Record<DayStatus, string> = {
  'pre-fertile': 'Not fertile yet',
  fertile: 'Fertile window',
  'post-peak': 'Safe (post-peak)',
  'post-calendar': 'Safe (by calendar)',
}

export const STATUS_TONES: Record<DayStatus, string> = {
  'pre-fertile': 'bg-amber-100 text-amber-900',
  fertile: 'bg-rose-100 text-rose-900',
  'post-peak': 'bg-emerald-100 text-emerald-900',
  'post-calendar': 'bg-stone-100 text-stone-900',
}

export const BEGIN_RULE_LABELS: Record<FertileWindow['beginRule'], string> = {
  'calendar-day-6': 'calendar rule (cycle day 6)',
  'calendar-earliest-peak-minus-6': 'earliest Peak − 6 days',
  'first-high-or-peak': 'first High or Peak reading',
}

export const END_RULE_LABELS: Record<FertileWindow['endRule'], string> = {
  'current-peak-plus-n': '3 days after Peak',
  'historic-peak-plus-n': 'latest historical Peak + 3 days',
  'earliest-end': 'earliest of historical vs current Peak',
  none: 'no end (no Peak yet)',
}

export function windowDescription(window: FertileWindow, peakKnown: boolean): string {
  const begin = `Fertile from cycle day ${window.begin} (${BEGIN_RULE_LABELS[window.beginRule]})`
  if (window.end === null) {
    return peakKnown
      ? `${begin}; end pending new readings after Peak.`
      : `${begin}; end unknown until a Peak is read.`
  }
  return `${begin}; until day ${window.end} (${END_RULE_LABELS[window.endRule]}).`
}

/** Cycle-day number for the given date within a cycle (day1 = first day of menses). */
export function dayInCycle(day1: string, date: string): number {
  const [y1, m1, d1] = day1.split('-').map(Number)
  const [y2, m2, d2] = date.split('-').map(Number)
  const start = Date.UTC(y1, m1 - 1, d1)
  const end = Date.UTC(y2, m2 - 1, d2)
  return Math.round((end - start) / 86_400_000) + 1
}