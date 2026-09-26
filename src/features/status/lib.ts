import type { DayStatus, FertileWindow } from '@/core/engine/types'
import { FERTILITY_STATUS_VISUALS } from '@/lib/fertility-visuals'
import { dayInCycle, dateKeyLocal, parseDateKey, todayKey } from '@/core/dateKeys'

export { dayInCycle, dateKeyLocal, parseDateKey, todayKey }

export const STATUS_LABELS: Record<DayStatus, string> = {
  'pre-fertile': 'Not fertile yet',
  fertile: 'Fertile window',
  'post-peak': 'Safe (post-peak)',
  'post-calendar': 'Safe (by calendar)',
}

export const STATUS_TONES: Record<DayStatus, string> = {
  'pre-fertile': FERTILITY_STATUS_VISUALS['pre-fertile'].badge,
  fertile: FERTILITY_STATUS_VISUALS.fertile.badge,
  'post-peak': FERTILITY_STATUS_VISUALS['post-peak'].badge,
  'post-calendar': FERTILITY_STATUS_VISUALS['post-calendar'].badge,
}

export const BEGIN_RULE_LABELS: Record<FertileWindow['beginRule'], string> = {
  'calendar-day-6': 'calendar rule (cycle day 6)',
  'calendar-earliest-peak-minus-6': 'earliest Peak − 6 days',
  'first-high-or-peak': 'first High or Peak reading',
}

export const END_RULE_LABELS: Record<FertileWindow['endRule'], string> = {
  'current-peak-plus-n': 'current Peak + N days',
  'historic-peak-plus-n': 'latest historical Peak + N days',
  'earliest-end': 'earliest of historical vs current Peak',
  'protocol-default-band': 'protocol default band (no Peak history)',
  none: 'no end (no Peak yet)',
}

/** Rule text with the configured post-Peak interval substituted in. */
export function endRuleLabel(rule: FertileWindow['endRule'], postPeakDays: number): string {
  return END_RULE_LABELS[rule].replace('N days', `${postPeakDays} days`)
}

export function windowDescription(
  window: FertileWindow,
  peakKnown: boolean,
  postPeakDays: number,
): string {
  const begin = `Fertile from cycle day ${window.begin} (${BEGIN_RULE_LABELS[window.beginRule]})`
  if (window.end === null) {
    return peakKnown
      ? `${begin}; end pending new readings after Peak.`
      : `${begin}; end unknown until a Peak is read.`
  }
  return `${begin}; until day ${window.end} (${endRuleLabel(window.endRule, postPeakDays)}).`
}