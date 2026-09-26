import type { DateKey } from "./types";

/**
 * Pure cycle-placement for logged day records.
 *
 * Marquette rule anchored here: Day 1 = first day of menses. Each logged day is
 * either Menses (M) or No-menses (N); days with no data at all are not logged
 * and never appear here. A new cycle starts at:
 *
 *   - any anchor date (a cycle start the user declared explicitly),
 *   - the first logged day, when no cycle has been opened yet,
 *   - every M day whose previous *logged* day is an N.
 *
 * 0 days never break a cycle; only an explicit N does. A leading run of N days
 * forms its own single cycle with no menses recorded yet, and N days after
 * menses continue the current cycle.
 *
 * Order-independent by construction: grouping depends only on the set of logged
 * days, so backfilling in any order lands in the same cycles.
 *
 * Pure: no React, no IndexedDB — portable to a Python backend.
 */

export interface PlacedDay {
  date: DateKey;
  /** True when blood flow is light, medium, or heavy. */
  menses: boolean;
}

export interface CyclePlan {
  /** First day of the cycle: a declared start, the first menses day, or the leading N-run's start. */
  day1: DateKey;
  /** Logged dates assigned to this cycle, in ascending order. */
  dates: DateKey[];
}

/** A day counts as menses when blood flow is light, medium, or heavy. */
export function isMensesFlow(flow: string | undefined): boolean {
  return flow === "light" || flow === "medium" || flow === "heavy";
}

/**
 * @param days Logged days, in any order.
 * @param anchors Dates the user explicitly declared as a cycle start. Each always
 *   opens a cycle, even when no record exists on that date.
 */
export function planCycles(days: PlacedDay[], anchors: DateKey[] = []): CyclePlan[] {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // The next anchor at or after each logged day, so a declared start that has no
  // record of its own still claims the days that follow it.
  const sortedAnchors = [...anchors].sort();
  function nextAnchorFrom(date: DateKey): DateKey | null {
    for (const anchor of sortedAnchors) {
      if (anchor > date) {
        return anchor;
      }
    }
    return null;
  }

  const cycles: CyclePlan[] = [];
  let current: CyclePlan | null = null;
  let previous: PlacedDay | null = null;

  for (const day of sorted) {
    // A cycle is already open at this date when a declared start falls on it or
    // between the previous logged day and this one.
    const openAt = cycles.length > 0 ? cycles[cycles.length - 1].day1 : null;
    const pendingAnchor = nextAnchorFrom(openAt ?? "");
    const coveredByAnchor = pendingAnchor !== null && pendingAnchor <= day.date;

    if (coveredByAnchor) {
      current = { day1: pendingAnchor, dates: [] };
      cycles.push(current);
    } else if (!current || (day.menses && previous !== null && !previous.menses)) {
      current = { day1: day.date, dates: [] };
      cycles.push(current);
    }

    current.dates.push(day.date);
    previous = day;
  }

  return cycles;
}
