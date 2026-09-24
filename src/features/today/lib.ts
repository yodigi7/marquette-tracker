import type { DayStatus, FertileWindow } from '@/core/engine/types'
import { dayInCycle, dateKeyLocal, parseDateKey, todayKey } from '@/core/dateKeys'

export { dayInCycle, dateKeyLocal, parseDateKey, todayKey }

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