/** Month grid math: 6 weeks × 7 days, Monday-first, keys = local `YYYY-MM-DD`. */

import { dayInfo } from "@/core/cycleStatus";
import { dayInCycle, dateKeyLocal } from "@/core/dateKeys";
import type { CycleResult, DayStatus, FertileWindow } from "@/core/engine/types";
import { cycleForDate } from "@/core/store/selectors";
import type { CycleEntity, DayRecordEntity, WeekStart } from "@/core/store/entities";

export interface MonthGrid {
  /** 42 slots; slots outside the month are empty strings. */
  weeks: string[][];
  year: number;
  month: number;
}

export type { WeekStart } from "@/core/store/entities";

export function monthGrid(
  year: number,
  monthIndex: number,
  weekStart: WeekStart = "monday",
): MonthGrid {
  const first = new Date(year, monthIndex, 1);
  const offset = weekStart === "sunday" ? first.getDay() : (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - offset);

  const weeks: string[][] = [];
  for (let week = 0; week < 6; week++) {
    const row: string[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + week * 7 + day,
      );
      const key = dateKeyLocal(date);
      row.push(date.getMonth() === monthIndex ? key : "");
    }
    weeks.push(row);
  }
  return { weeks, year, month: monthIndex };
}

export function monthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Weekday short labels, Monday-first. */
export const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const WEEKDAY_LABELS_SUNDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function weekdayLabels(weekStart: WeekStart = "monday"): string[] {
  return weekStart === "sunday" ? WEEKDAY_LABELS_SUNDAY : WEEKDAY_LABELS;
}

export interface CellInfo {
  info: DayStatus | null;
  forecast: boolean;
  /** Menses the user recorded, or a real cycle's day 1, which is menses by construction. */
  menses: boolean;
  /**
   * The first day of a projected cycle. A prediction rather than a logged
   * observation, so it is a separate flag: one control that governs the
   * raw-menses layer must not also remove a forecast cue.
   */
  cycleStart: boolean;
  monitor: DayRecordEntity["monitor"];
  intercourse: boolean;
  /**
   * Whether this day is the first or last day of the fertile window, which the Calendar's band rounds
   * at. Derived from the same window that produced `info`, so the shaping and the status cannot
   * disagree. A window with no end — a cycle with no monitor Peak — has a first day but never a last,
   * so it marks its start only.
   *
   * These are pure functions of the window and carry no month information, so a run that is merely
   * clipped by the edge of a displayed month is not marked at the clip. The window's end is a protocol
   * result; reporting one at a month boundary would report an end the window does not have.
   */
  windowStart: boolean;
  windowEnd: boolean;
}

/**
 * Which end of the window a cycle day sits at, given the window that produced its status.
 */
function windowEnds(
  window: FertileWindow,
  dayNo: number,
): Pick<CellInfo, "windowStart" | "windowEnd"> {
  return {
    windowStart: dayNo === window.begin,
    windowEnd: window.end !== null && dayNo === window.end,
  };
}

const NO_WINDOW_ENDS: Pick<CellInfo, "windowStart" | "windowEnd"> = {
  windowStart: false,
  windowEnd: false,
};

/**
 * Which edges of the fertile window a day cell should draw.
 *
 * The window is drawn as a full-height block rather than a strip on the cell's top edge, because a
 * strip and the menses stripe are both horizontal lines at opposite cell edges and sit 8px apart
 * across a week boundary, where they read as one mark.
 *
 * A block's edges cannot be decided per cell, so they are computed here from the whole month. A day
 * cell has no idea whether the day above or beside it is inside the window, and guessing is what
 * produced two defects in a first attempt: a horizontal seam across the middle of a window that
 * continued into the next row, and end days that were half square and half rounded.
 *
 * A window that crosses a week boundary is two separate horizontal runs, because the last day of one
 * row is in the final column and the next day is in the first. Those cells are not neighbours, so
 * there is no shape that joins them, and the block is drawn per row with the grid gap left open. The
 * eye joins the segments because they are the same colour, aligned, and in adjacent rows.
 */
export interface WindowEdges {
  /** The cell starts a run within its row. */
  start: boolean;
  /** The cell ends a run within its row. */
  end: boolean;
  /** The run continues into the same column in the row above. */
  continuesUp: boolean;
  /** The run continues into the same column in the row below. */
  continuesDown: boolean;
  /** This is the window's first day overall, so its outer edge is rounded. */
  roundStart: boolean;
  /** This is the window's last day overall, so its outer edge is rounded. */
  roundEnd: boolean;
}

/** No edges: the day is not inside the window, so it is not part of a run. */
export const NO_WINDOW_EDGES: WindowEdges = {
  start: false,
  end: false,
  continuesUp: false,
  continuesDown: false,
  roundStart: false,
  roundEnd: false,
};

/**
 * Compute the window's edges for every day in a displayed month.
 *
 * Takes the month's cell positions in row-major order along with whether each is inside the window,
 * and returns the edges for each. Pure, so the shape can be tested without rendering anything.
 */
export function windowEdgesByDay(
  slots: readonly { dateKey: string; inWindow: boolean }[],
  /**
   * The window's true last day, when it is on screen. A run that merely runs off the end of the
   * displayed month is clipped, not finished, so it must not be rounded as though it ended there —
   * the window's end is a protocol result and this display is not where it happened.
   */
  windowEndsOn?: string,
): Record<string, WindowEdges> {
  const edges: Record<string, WindowEdges> = {};
  const width = 7;
  const inWindowAt = new Map(slots.map((slot) => [slot.dateKey, slot.inWindow]));
  const windowSlots = slots.filter((slot) => slot.inWindow);

  for (const [index, slot] of slots.entries()) {
    if (!slot.inWindow) {
      edges[slot.dateKey] = NO_WINDOW_EDGES;
      continue;
    }
    const row = Math.floor(index / width);
    const sameRow = slots.filter(
      (_, i) => Math.floor(i / width) === row && inWindowAt.get(slots[i].dateKey),
    );
    const sameColumnUp = slots[index - width];
    const sameColumnDown = slots[index + width];

    edges[slot.dateKey] = {
      start: sameRow[0] === slot,
      end: sameRow[sameRow.length - 1] === slot,
      // The row above may be a shorter row at the top of the month, so the slot has to exist and
      // be in the window rather than being assumed.
      continuesUp: sameColumnUp !== undefined && sameColumnUp.inWindow,
      continuesDown: sameColumnDown !== undefined && sameColumnDown.inWindow,
      roundStart: windowSlots[0] === slot,
      // The last day on screen is the window's end only if the window actually ends there. Absent
      // that, the run is clipped and the edge stays square, matching the `windowEnd` rule the grid
      // already reports for the same reason.
      roundEnd:
        windowSlots[windowSlots.length - 1] === slot &&
        (windowEndsOn === undefined || windowEndsOn === slot.dateKey),
    };
  }
  return edges;
}

/** Latest projected cycle covering the date, if any. */
function projectedCycleForDate(projected: CycleResult[], dateKey: string): CycleResult | undefined {
  for (let index = projected.length - 1; index >= 0; index--) {
    if (projected[index].day1 <= dateKey) {
      return projected[index];
    }
  }
  return undefined;
}

/** Per-day resolution: real cycle → projected cycle → record markers → forecast overlay.
 * The status band is derived from the cycle's window, so it is painted for every
 * past day inside a cycle whether or not an observation was recorded. Future dates
 * stay blank and are covered only by the forecast outline; they get no menses dot.
 *
 * A date covered by a projected cycle resolves its status from that cycle's window
 * and is marked as forecast. Projected cycles are only consulted for dates after
 * today, so a real cycle's derived days keep their own treatment. A projected
 * cycle's day 1 is reported as `cycleStart` rather than `menses`, because the app
 * is predicting that period rather than reporting one the user logged.
 */
export function resolveCell(
  cycles: CycleEntity[],
  dayRecords: DayRecordEntity[],
  results: Map<string, CycleResult>,
  forecast: { begin: string; end: string } | undefined,
  dateKey: string,
  today: string,
  projected: CycleResult[] = [],
): CellInfo {
  const cycle = cycleForDate(cycles, dateKey);
  const record = cycle
    ? dayRecords.find((r) => r.cycleId === cycle.id && r.date === dateKey)
    : undefined;

  const isFuture = dateKey > today;
  const inForecast = !!forecast && dateKey >= forecast.begin && dateKey <= forecast.end;

  const projectedCycle = isFuture ? projectedCycleForDate(projected, dateKey) : undefined;
  if (projectedCycle) {
    const dayNo = dayInCycle(projectedCycle.day1, dateKey);
    return {
      // The phase still comes from the projected window; the forecast flag is
      // what tells the cell this day has not happened yet.
      info: statusForWindow(projectedCycle, dayNo),
      forecast: true,
      menses: false,
      cycleStart: dayNo === 1,
      monitor: undefined,
      intercourse: false,
      // A projected window is shaped the same way a recorded one is, so a
      // forecast band reads as the same kind of interval.
      ...windowEnds(projectedCycle.fertileWindow, dayNo),
    };
  }

  const dayNo = cycle ? dayInCycle(cycle.day1, dateKey) : 0;
  const result = cycle ? results.get(cycle.id) : undefined;
  const status = isFuture ? null : statusForCell(cycle, results, dateKey);

  return {
    // Derived from the window, so an unlogged day inside a cycle still has a
    // status. Future dates are left to the forecast treatment.
    info: status,
    forecast: inForecast && isFuture && !record,
    menses: !isFuture && mensesFor(record, dayNo),
    cycleStart: false,
    monitor: record?.monitor && record.monitor !== "none" ? record.monitor : undefined,
    intercourse: !!record?.intercourse,
    // No status means no band to shape: a day outside a cycle, a future date with no projection, and
    // a day past a closed cycle all render unbanded.
    ...(status && result ? windowEnds(result.fertileWindow, dayNo) : NO_WINDOW_ENDS),
  };
}

function statusForWindow(result: CycleResult, dayNo: number): DayStatus | null {
  if (dayNo < 1 || (result.length !== null && dayNo > result.length)) {
    return null;
  }
  return dayInfo(result.fertileWindow, result.lastPeakDay !== null, dayNo);
}

function statusForCell(
  cycle: CycleEntity | undefined,
  results: Map<string, CycleResult>,
  dateKey: string,
): DayStatus | null {
  if (!cycle) {
    return null;
  }
  const result = results.get(cycle.id);
  if (!result) {
    return null;
  }
  const dayNo = dayInCycle(cycle.day1, dateKey);
  const beyondCycle = cycle.closedAt !== null && dateKey > cycle.closedAt;
  if (beyondCycle) {
    return null;
  }
  return dayInfo(result.fertileWindow, result.lastPeakDay !== null, dayNo);
}

function mensesFor(record: DayRecordEntity | undefined, dayNo: number): boolean {
  if (record?.bloodFlow !== undefined && record.bloodFlow !== "none") {
    return true;
  }
  return dayNo === 1;
}
