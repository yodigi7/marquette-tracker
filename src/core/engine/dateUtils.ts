import type { DateKey } from './types'

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isDateKey(value: string): value is DateKey {
  return DATE_KEY_RE.test(value)
}

/** Days since the Unix epoch for a DateKey (UTC, no time component). */
export function dateKeyToEpochDays(key: DateKey): number {
  const match = DATE_KEY_RE.exec(key)
  if (!match) {
    throw new Error(`Invalid DateKey: ${key}`)
  }
  const [, year, month, day] = match
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000)
}

export function epochDaysToDateKey(days: number): DateKey {
  const date = new Date(days * 86_400_000)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Adds n days to a DateKey (n may be negative). */
export function addDays(key: DateKey, n: number): DateKey {
  return epochDaysToDateKey(dateKeyToEpochDays(key) + n)
}

/** b - a in whole days. */
export function diffDays(from: DateKey, to: DateKey): number {
  return dateKeyToEpochDays(to) - dateKeyToEpochDays(from)
}