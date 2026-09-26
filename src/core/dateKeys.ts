/** Local-calendar date helpers. Browser-only (uses local timezone), kept out of engine/dateUtils. */

/** Local-calendar date key ('YYYY-MM-DD') for the given Date. */
export function dateKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's date key in the user's local calendar. */
export function todayKey(now: Date = new Date()): string {
  return dateKeyLocal(now);
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Cycle-day number for the given date within a cycle (day1 = first day of menses). */
export function dayInCycle(day1: string, date: string): number {
  const [y1, m1, d1] = day1.split("-").map(Number);
  const [y2, m2, d2] = date.split("-").map(Number);
  const start = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  return Math.round((end - start) / 86_400_000) + 1;
}
