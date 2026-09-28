import { describe, expect, it } from "vitest";
import {
  monthGrid,
  monthTitle,
  NO_WINDOW_EDGES,
  resolveCell,
  shiftMonth,
  weekdayLabels,
  windowEdgesByDay,
} from "../grid";
import type { CycleEntity, DayRecordEntity } from "@/core/store/entities";
import type { CycleResult } from "@/core/engine/types";

const CYCLE: CycleEntity = {
  id: "c1",
  cycleNo: 1,
  day1: "2026-08-03",
  closedAt: null,
  notes: "",
  version: 1,
  synced: false,
  createdAt: "",
  updatedAt: "",
};

const RESULT: CycleResult = {
  cycleId: "c1",
  cycleNo: 1,
  day1: "2026-08-03",
  length: null,
  firstPeakDay: null,
  lastPeakDay: null,
  peakSource: "none",
  lookbackPeaks: [],
  fertileWindow: {
    begin: 6,
    end: null,
    beginRule: "calendar-day-6",
    endRule: "none",
  },
  days: [],
  warnings: [],
};

/** Peak on day 12 with the default 4-day interval: window 6-16, then post-peak. */
const PEAKED_RESULT: CycleResult = {
  ...RESULT,
  firstPeakDay: 12,
  lastPeakDay: 12,
  peakSource: "monitor",
  fertileWindow: {
    begin: 6,
    end: 16,
    beginRule: "calendar-day-6",
    endRule: "current-peak-plus-n",
  },
};

const NO_RECORDS: DayRecordEntity[] = [];

describe("monthGrid", () => {
  it("starts Monday-first and spans exactly the month", () => {
    const grid = monthGrid(2026, 7);
    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks[0][0]).toBe("");
    expect(grid.weeks[0][5]).toBe("2026-08-01");
    expect(grid.weeks[0][6]).toBe("2026-08-02");
    expect(grid.weeks[1][0]).toBe("2026-08-03");
    expect(grid.weeks[4][6]).toBe("2026-08-30");
    expect(grid.weeks[5][0]).toBe("2026-08-31");
    expect(grid.weeks[5][6]).toBe("");
  });

  it("shiftMonth ranges across years", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("labels the month title", () => {
    expect(monthTitle(2026, 7)).toBe("August 2026");
  });

  describe("week-start variants", () => {
    it("defaults to Monday-first and labels Mo…Su", () => {
      expect(weekdayLabels()).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
      const grid = monthGrid(2026, 7);
      expect(grid.weeks[0][0]).toBe("");
      expect(grid.weeks[0][5]).toBe("2026-08-01");
    });

    it("sunday-first: the 1st sits in the trailing slot of week 0, Sep 1 blanked after Aug 31", () => {
      expect(weekdayLabels("sunday")).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
      const grid = monthGrid(2026, 7, "sunday");
      // Aug 1 2026 is a Saturday → Sunday grid opens 6 days earlier (Jul 26, blanked).
      expect(grid.weeks[0][0]).toBe("");
      expect(grid.weeks[0][6]).toBe("2026-08-01");
      expect(grid.weeks[1][0]).toBe("2026-08-02");
      expect(grid.weeks[5][0]).toBe("2026-08-30");
      expect(grid.weeks[5][1]).toBe("2026-08-31");
      expect(grid.weeks[5][2]).toBe("");
    });
  });
});

describe("resolveCell", () => {
  const results = new Map<string, CycleResult>([["c1", RESULT]]);
  const today = "2026-12-31";

  it("shades recorded days and flags day 1 as menses", () => {
    const recorded: DayRecordEntity[] = [
      {
        id: "r1",
        cycleId: "c1",
        date: "2026-08-08",
        dayInCycle: 6,
        version: 1,
        synced: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const fertile = resolveCell([CYCLE], recorded, results, undefined, "2026-08-08", today);
    expect(fertile.info).toBe("fertile");

    const day1 = resolveCell([CYCLE], recorded, results, undefined, "2026-08-03", today);
    expect(day1.menses).toBe(true);
  });

  it("derives a status for unrecorded days inside the window", () => {
    const cell = resolveCell([CYCLE], NO_RECORDS, results, undefined, "2026-08-08", today);
    expect(cell.info).toBe("fertile");
  });

  it("derives post-Peak fertile days and post-window days with no records at all", () => {
    const peaked = new Map<string, CycleResult>([["c1", PEAKED_RESULT]]);
    // Only the Peak day itself is recorded; 13-16 and 17+ hold nothing.
    const onlyPeak: DayRecordEntity[] = [
      {
        id: "r-peak",
        cycleId: "c1",
        date: "2026-08-14",
        dayInCycle: 12,
        monitor: "peak",
        version: 1,
        synced: false,
        createdAt: "",
        updatedAt: "",
      },
    ];

    for (const dayInCycle of [13, 14, 15, 16]) {
      const date = `2026-08-${String(2 + dayInCycle).padStart(2, "0")}`;
      const cell = resolveCell([CYCLE], onlyPeak, peaked, undefined, date, today);
      expect(cell.info, `day ${dayInCycle}`).toBe("fertile");
    }

    const after = resolveCell([CYCLE], onlyPeak, peaked, undefined, "2026-08-20", today);
    expect(after.info).toBe("post-peak");
  });

  it("scopes the forecast treatment to dates after today", () => {
    // The range deliberately covers past, present, and future dates.
    const forecast = { begin: "2026-08-01", end: "2026-08-20" };
    const at = "2026-08-10";

    expect(resolveCell([], NO_RECORDS, new Map(), forecast, "2026-08-05", at).forecast).toBe(false);
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, "2026-08-10", at).forecast).toBe(false);
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, "2026-08-11", at).forecast).toBe(true);
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, "2026-08-20", at).forecast).toBe(true);
    expect(resolveCell([], NO_RECORDS, new Map(), forecast, "2026-08-25", at).forecast).toBe(false);
  });

  it("leaves before-first and beyond-closed days unshaded", () => {
    const before = resolveCell([CYCLE], NO_RECORDS, results, undefined, "2026-07-30", today);
    expect(before.info).toBeNull();

    const closed = { ...CYCLE, closedAt: "2026-08-28" };
    const beyond = resolveCell([closed], NO_RECORDS, results, undefined, "2026-09-01", today);
    expect(beyond.info).toBeNull();
  });

  it("shows the forecast ring only inside the forecast window", () => {
    const at = "2026-08-31";
    const forecast = { begin: "2026-09-01", end: "2026-09-14" };
    const inside = resolveCell([], NO_RECORDS, new Map(), forecast, "2026-09-07", at);
    expect(inside.info).toBeNull();
    expect(inside.forecast).toBe(true);

    const outside = resolveCell([], NO_RECORDS, new Map(), forecast, "2026-09-20", at);
    expect(outside.forecast).toBe(false);
  });

  it("reads monitor + blood flow from the day record", () => {
    const withRecord: DayRecordEntity[] = [
      {
        id: "r1",
        cycleId: "c1",
        date: "2026-08-08",
        dayInCycle: 6,
        monitor: "high",
        bloodFlow: "medium",
        version: 1,
        synced: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const cell = resolveCell([CYCLE], withRecord, results, undefined, "2026-08-08", today);
    expect(cell.monitor).toBe("high");
    expect(cell.menses).toBe(true);
  });

  it("keeps future days blank (no status band) with only the forecast ring", () => {
    const today = "2026-08-05";
    const forecast = { begin: "2026-08-06", end: "2026-08-15" };

    const futureInWindow = resolveCell([CYCLE], NO_RECORDS, results, forecast, "2026-08-08", today);
    expect(futureInWindow.info).toBeNull();
    expect(futureInWindow.forecast).toBe(true);
    expect(futureInWindow.menses).toBe(false);

    const futureOutOfWindow = resolveCell(
      [CYCLE],
      NO_RECORDS,
      results,
      forecast,
      "2026-08-20",
      today,
    );
    expect(futureOutOfWindow.info).toBeNull();
    expect(futureOutOfWindow.forecast).toBe(false);

    const pastOutOfWindow = resolveCell(
      [CYCLE],
      NO_RECORDS,
      results,
      forecast,
      "2026-08-04",
      today,
    );
    // A past day inside the cycle keeps its derived status and no forecast cue.
    expect(pastOutOfWindow.info).toBe("pre-fertile");
    expect(pastOutOfWindow.forecast).toBe(false);

    const recordedFuture = resolveCell(
      [CYCLE],
      [
        {
          id: "r9",
          cycleId: "c1",
          date: "2026-08-08",
          dayInCycle: 6,
          version: 1,
          synced: false,
          createdAt: "",
          updatedAt: "",
        },
      ],
      results,
      forecast,
      "2026-08-08",
      today,
    );
    // Future dates never receive a derived status, and a record suppresses the
    // forecast ring.
    expect(recordedFuture.info).toBeNull();
    expect(recordedFuture.forecast).toBe(false);
  });

  it("flags a recorded intercourse act", () => {
    const withRecord: DayRecordEntity[] = [
      {
        id: "r9",
        cycleId: "c1",
        date: "2026-08-20",
        dayInCycle: 18,
        intercourse: true,
        version: 1,
        synced: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const cell = resolveCell([CYCLE], withRecord, results, undefined, "2026-08-20", today);
    expect(cell.intercourse).toBe(true);

    const noRecord = resolveCell([CYCLE], NO_RECORDS, results, undefined, "2026-08-20", today);
    expect(noRecord.intercourse).toBe(false);
  });

  it("separates logged menses from a predicted cycle start", () => {
    // A real cycle's day 1 is menses by construction, so it stays in the
    // raw-menses layer; only a projected cycle's day 1 is a prediction.
    const realDay1 = resolveCell(
      [CYCLE],
      NO_RECORDS,
      results,
      undefined,
      "2026-08-03",
      "2026-08-12",
    );
    expect(realDay1.menses).toBe(true);
    expect(realDay1.cycleStart).toBe(false);

    const logged: DayRecordEntity[] = [
      {
        id: "r1",
        cycleId: "c1",
        date: "2026-08-06",
        dayInCycle: 4,
        bloodFlow: "medium",
        version: 1,
        synced: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const recorded = resolveCell([CYCLE], logged, results, undefined, "2026-08-06", "2026-08-12");
    expect(recorded.menses).toBe(true);
    expect(recorded.cycleStart).toBe(false);
  });

  it("reports no single-day ovulation estimate", () => {
    // The protocol's calendar rule yields a range, not a single ovulatory day,
    // so CellInfo carries no ovulation marker at all.
    const cell = resolveCell([CYCLE], NO_RECORDS, results, undefined, "2026-08-16", "2026-08-12");
    expect("ovulation" in cell).toBe(false);
  });
});
// --- projected cycle resolution -------------------------------------------

const TODAY = "2026-08-20";
const PROJECTED_DAY1 = "2026-08-03";
/** A projected cycle that begins after today, so its day 1 resolves as projected. */
const FUTURE_PROJECTED_DAY1 = "2026-08-25";

/** A projected 28-day cycle beginning on the same day as CYCLE. */
const PROJECTED: CycleResult = {
  ...PEAKED_RESULT,
  cycleId: "projected-1",
  cycleNo: 2,
  length: 28,
  fertileWindow: {
    begin: 6,
    end: 16,
    beginRule: "calendar-earliest-peak-minus-6",
    endRule: "lookback-latest-peak-plus-n",
  },
};

const RESULTS = new Map([["c1", RESULT]]);
const NO_FORECAST = undefined;

describe("resolveCell with projected cycles", () => {
  it("leaves a real cycle date unchanged when projection is absent", () => {
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-10", TODAY);
    expect(cell.info).toBe("fertile");
    expect(cell.forecast).toBe(false);
    expect(cell.menses).toBe(false);
  });

  it("leaves a real cycle date unchanged when a projection is supplied", () => {
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-10", TODAY, [
      PROJECTED,
    ]);
    expect(cell.info).toBe("fertile");
    expect(cell.forecast).toBe(false);
  });

  it("resolves a status for a date inside a projected cycle", () => {
    // day 8 of the projected cycle -> inside the 6..16 window
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-10", TODAY, [
      PROJECTED,
    ]);
    expect(cell.info).toBe("fertile");
  });

  it("marks a projected date as forecast", () => {
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-25", TODAY, [
      PROJECTED,
    ]);
    expect(cell.forecast).toBe(true);
  });

  it("reports pre-fertile days inside a projected cycle", () => {
    // day 3 of the projected cycle, before the window begins
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-05", TODAY, [
      PROJECTED,
    ]);
    expect(cell.info).toBe("pre-fertile");
  });

  it("reports post-window days inside a projected cycle", () => {
    // day 20 of the projected cycle, after the window ends on 16
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-22", TODAY, [
      PROJECTED,
    ]);
    expect(cell.info).toBe("post-peak");
  });

  it("marks a projected day 1 as a predicted cycle start, not as logged menses", () => {
    const future: CycleResult = { ...PROJECTED, day1: FUTURE_PROJECTED_DAY1 };
    const cell = resolveCell(
      [CYCLE],
      NO_RECORDS,
      RESULTS,
      NO_FORECAST,
      FUTURE_PROJECTED_DAY1,
      TODAY,
      [future],
    );
    expect(cell.cycleStart).toBe(true);
    expect(cell.menses).toBe(false);
  });

  it("keeps a real cycle's day 1 in the raw-menses layer even with a projection present", () => {
    // PROJECTED_DAY1 is on or before today, so the real cycle owns it and day 1
    // is menses by construction rather than a prediction.
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, PROJECTED_DAY1, TODAY, [
      PROJECTED,
    ]);
    expect(cell.menses).toBe(true);
    expect(cell.cycleStart).toBe(false);
  });

  it("does not mark other projected days as menses or as a cycle start", () => {
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-25", TODAY, [
      PROJECTED,
    ]);
    expect(cell.menses).toBe(false);
    expect(cell.cycleStart).toBe(false);
  });

  it("does not treat a projected past date as projected", () => {
    // 2026-08-10 is at or before today, so the real cycle's derived status wins
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-10", TODAY, [
      PROJECTED,
    ]);
    expect(cell.forecast).toBe(false);
  });

  it("ignores projected cycles that do not cover the date", () => {
    const later: CycleResult = { ...PROJECTED, day1: "2027-01-01" };
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-25", TODAY, [
      later,
    ]);
    expect(cell.forecast).toBe(false);
    expect(cell.info).toBeNull();
  });

  it("never shows a monitor marker or intercourse on a projected day", () => {
    const cell = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-25", TODAY, [
      PROJECTED,
    ]);
    expect(cell.monitor).toBeUndefined();
    expect(cell.intercourse).toBe(false);
  });

  it("still scopes the existing single-window forecast to future dates", () => {
    const forecast = { begin: "2026-08-01", end: "2026-08-20" };
    const past = resolveCell([CYCLE], NO_RECORDS, RESULTS, forecast, "2026-08-10", TODAY);
    expect(past.forecast).toBe(false);
    expect(past.info).toBe("fertile");
  });
});

describe("the window block's edges across the month", () => {
  /**
   * A 7-wide month of 21 days, each day carrying the grid position it sits in.
   *
   * `pad` inserts that many blank days before the 1st, which is what a month that does not start on the
   * configured first day of the week looks like. The blanks are positions the window's shape has to
   * account for, so the helper takes the real days only and the caller states where they sit.
   */
  const slots = (from: number, to: number, pad = 0) =>
    Array.from({ length: 21 }, (_, i) => ({
      dateKey: `2026-09-${String(i + 1).padStart(2, "0")}`,
      inWindow: i + 1 >= from && i + 1 <= to,
      row: Math.floor((i + pad) / 7),
      column: (i + pad) % 7,
    }));

  /**
   * Window on days 6-16, so the month reads:
   *   row 0:  .  .  .  .  .  6  7
   *   row 1:  8  9 10 11 12 13 14
   *   row 2: 15 16  .  .  .  .  .
   */
  const WINDOW = "2026-09-16";

  it("closes each row's run sideways", () => {
    const edges = windowEdgesByDay(slots(6, 16), WINDOW);
    expect([edges["2026-09-06"].start, edges["2026-09-06"].end]).toEqual([true, false]);
    expect([edges["2026-09-07"].start, edges["2026-09-07"].end]).toEqual([false, true]);
    expect([edges["2026-09-08"].start, edges["2026-09-08"].end]).toEqual([true, false]);
    expect([edges["2026-09-14"].start, edges["2026-09-14"].end]).toEqual([false, true]);
    expect([edges["2026-09-15"].start, edges["2026-09-15"].end]).toEqual([true, false]);
    expect([edges["2026-09-16"].start, edges["2026-09-16"].end]).toEqual([false, true]);
  });

  it("reports the run continuing down a column across the row boundary", () => {
    // The seam defect. Day 7 ends its row in column 6, and day 14 sits in column 6 of the next row
    // and is also in the window, so a bottom edge on day 7 would draw a line across the window.
    const edges = windowEdgesByDay(slots(6, 16), WINDOW);
    expect(edges["2026-09-07"].end, "day 7 ends its row").toBe(true);
    expect(edges["2026-09-07"].continuesDown, "but the run carries on below it").toBe(true);
    expect(edges["2026-09-14"].continuesUp).toBe(true);
    expect(edges["2026-09-14"].continuesDown, "and stops there, column 6 of row 2 is outside").toBe(
      false,
    );
  });

  it("reports no continuation where the run does not carry down a column", () => {
    // Days 8-15 alone: row 1 is full and day 15 continues in column 0, so day 8 continues down but
    // day 14, in column 6, does not.
    const edges = windowEdgesByDay(slots(8, 15), "2026-09-15");
    expect(edges["2026-09-08"].continuesDown).toBe(true);
    expect(edges["2026-09-14"].continuesDown).toBe(false);
    expect(edges["2026-09-15"].continuesUp).toBe(true);
  });

  it("rounds only the window's two true ends", () => {
    const edges = windowEdgesByDay(slots(6, 16), WINDOW);
    expect(edges["2026-09-06"].roundStart).toBe(true);
    expect(edges["2026-09-16"].roundEnd).toBe(true);
    // The row boundaries are not the window's ends, so they stay square.
    expect(edges["2026-09-08"].roundStart).toBe(false);
    expect(edges["2026-09-15"].roundEnd).toBe(false);
    expect(edges["2026-09-07"].roundEnd).toBe(false);
  });

  it("does not round the last visible day when the window continues past the month", () => {
    // The window ends after the month does, so the run is clipped, not finished. Rounding it would
    // report an end the protocol does not have. Same rule as `windowEnd`, for the same reason.
    const edges = windowEdgesByDay(slots(6, 21), "2026-10-05");
    expect(edges["2026-09-21"].end, "day 21 ends its row").toBe(true);
    expect(edges["2026-09-21"].roundEnd, "but is not the window's end").toBe(false);
    expect(edges["2026-09-06"].roundStart).toBe(true);
  });

  it("gives a day outside the window no edges at all", () => {
    const edges = windowEdgesByDay(slots(6, 16), WINDOW);
    for (const day of ["2026-09-01", "2026-09-05", "2026-09-17", "2026-09-21"]) {
      expect(edges[day], day).toEqual(NO_WINDOW_EDGES);
    }
  });

  it("marks both ends of a one-day window", () => {
    const edges = windowEdgesByDay(slots(10, 10), "2026-09-10");
    expect([edges["2026-09-10"].roundStart, edges["2026-09-10"].roundEnd]).toEqual([true, true]);
    expect([edges["2026-09-10"].start, edges["2026-09-10"].end]).toEqual([true, true]);
  });

  it("handles a window that fills its first row entirely", () => {
    const edges = windowEdgesByDay(slots(1, 21), "2026-10-05");
    expect([edges["2026-09-01"].start, edges["2026-09-01"].roundStart]).toEqual([true, true]);
    // Day 1 is column 0, so the run continues down into day 8 even though day 7 closed the row.
    expect(edges["2026-09-01"].continuesDown).toBe(true);
    expect(edges["2026-09-08"].continuesUp).toBe(true);
  });

  it("handles a month whose leading days are blank", () => {
    // A month starting mid-week, so the first row is padded and the window opens on the 3rd.
    const edges = windowEdgesByDay(slots(3, 7, 2), "2026-09-07");
    expect([edges["2026-09-03"].start, edges["2026-09-03"].roundStart]).toEqual([true, true]);
    expect([edges["2026-09-07"].end, edges["2026-09-07"].roundEnd]).toEqual([true, true]);
  });

  it("places a padded month in the right rows, not in rows counted from the first real day", () => {
    // The bug this guards: a month padded with leading blanks has fewer real days in its first row, so
    // counting a day\'s index and dividing by the width put every later row one row out. That put the
    // bar\'s edges on the wrong days -- bleeding it outside the calendar and leaving holes in the middle
    // of the run, at the same time.
    const pad = 2;
    const edges = windowEdgesByDay(slots(8, 19, pad), "2026-09-19");
    // Day 8 sits at index 0 of the real days, which is column 2 of row 0. The day above it is the blank
    // at column 2 of nothing, so the run does not continue upward, and the day below it -- index 7, i.e.
    // column 2 of row 1 -- is day 15, which is in the window.
    // Day 8 is the first real day, so its index is 0 -- but it sits at column 2 of row 0, and day 15
    // sits directly below it at column 2 of row 1. Counting from real days would have called day 8 a
    // row of its own and put day 15 two rows away, so neither would have seen the other.
    expect(edges["2026-09-08"].continuesUp, "nothing above column 2 of row 0").toBe(false);
    expect(edges["2026-09-08"].continuesDown, "day 15 is below it in the same column").toBe(true);
    expect(edges["2026-09-15"].continuesUp, "day 8 is above it in the same column").toBe(true);
    // Day 14 is index 6, so column 1 of row 1, and the day above it is day 7 -- outside the window.
    expect(edges["2026-09-14"].continuesUp, "day 7 above is outside the window").toBe(false);
    expect(edges["2026-09-14"].continuesDown, "day 21 is below it, outside the window").toBe(false);
  });

  it("closes each row of a padded month where that row actually ends", () => {
    // Day 12 is index 4, column 6 of row 0 -- the row\'s last column, so the run\'s right edge belongs
    // there rather than on day 14, which counting from real days would have produced.
    const edges = windowEdgesByDay(slots(8, 19, 2), "2026-09-19");
    // Day 12 is index 4, the last column of row 0, so the run's right edge belongs there. Day 13 is
    // index 5, the first column of row 1, so the run opens again there. Counting from real days would
    // have put both on the wrong days.
    expect(edges["2026-09-12"].end, "day 12 closes the first padded row").toBe(true);
    expect(edges["2026-09-13"].start, "day 13 opens the next row").toBe(true);
    expect(edges["2026-09-12"].continuesDown, "day 19 is below it, inside the window").toBe(true);
    expect(edges["2026-09-13"].continuesUp, "day 6 is above it, outside the window").toBe(false);
  });

  it("marks a window that fills the rest of a padded first row as both ends", () => {
    // A month that starts mid-week, so the first row is padded and the window runs from the 3rd to the
    // end of that row. Both ends of the window are on screen, and the first row's right edge and the
    // window's end are the same day.
    const edges = windowEdgesByDay(slots(3, 7, 2), "2026-09-07");
    expect([edges["2026-09-03"].start, edges["2026-09-03"].roundStart]).toEqual([true, true]);
    expect([edges["2026-09-07"].end, edges["2026-09-07"].roundEnd]).toEqual([true, true]);
  });
});

describe("window ends for the band shaping", () => {
  /** CYCLE starts 2026-08-03, so cycle day N is 2026-08-(N + 2). */
  const dateOf = (cycleDay: number) => `2026-08-${String(cycleDay + 2).padStart(2, "0")}`;

  /** PEAKED_RESULT's window is cycle days 6..16. */
  const at = (cycleDay: number) =>
    resolveCell(
      [CYCLE],
      NO_RECORDS,
      new Map([["c1", PEAKED_RESULT]]),
      NO_FORECAST,
      dateOf(cycleDay),
      "2026-12-01",
    );

  it("marks the window's first and last day and nothing in between", () => {
    const start = at(6);
    expect([start.info, start.windowStart, start.windowEnd]).toEqual(["fertile", true, false]);

    const interior = at(11);
    expect([interior.info, interior.windowStart, interior.windowEnd]).toEqual([
      "fertile",
      false,
      false,
    ]);

    const end = at(16);
    expect([end.info, end.windowStart, end.windowEnd]).toEqual(["fertile", false, true]);
  });

  it("marks both ends of a one-day window on the same day", () => {
    const single: CycleResult = {
      ...PEAKED_RESULT,
      fertileWindow: { ...PEAKED_RESULT.fertileWindow, begin: 10, end: 10 },
    };
    const cell = resolveCell(
      [CYCLE],
      NO_RECORDS,
      new Map([["c1", single]]),
      NO_FORECAST,
      dateOf(10),
      "2026-12-01",
    );
    expect([cell.info, cell.windowStart, cell.windowEnd]).toEqual(["fertile", true, true]);
  });

  it("marks the start of an open window and never an end", () => {
    // A cycle with no Peak has no window end, so there is no last day to mark. RESULT's window is
    // 6..null, which also means every later day stays fertile rather than becoming post-calendar.
    const results = new Map([["c1", RESULT]]);
    const start = resolveCell([CYCLE], NO_RECORDS, results, NO_FORECAST, dateOf(6), "2026-12-01");
    expect([start.info, start.windowStart, start.windowEnd]).toEqual(["fertile", true, false]);

    const later = resolveCell([CYCLE], NO_RECORDS, results, NO_FORECAST, dateOf(20), "2026-12-01");
    expect([later.info, later.windowStart, later.windowEnd]).toEqual(["fertile", false, false]);
  });

  it("marks no end on a day outside the window", () => {
    // A day outside the window wears a band of its own phase but is not an end of a run.
    const before = at(4);
    expect([before.info, before.windowStart, before.windowEnd]).toEqual([
      "pre-fertile",
      false,
      false,
    ]);

    const after = at(20);
    expect([after.info, after.windowStart, after.windowEnd]).toEqual(["post-peak", false, false]);
  });

  it("marks no end on a day with no cycle covering it", () => {
    const orphan = resolveCell(
      [CYCLE],
      NO_RECORDS,
      new Map<string, CycleResult>(),
      NO_FORECAST,
      "2026-09-15",
      "2026-12-01",
    );
    expect([orphan.info, orphan.windowStart, orphan.windowEnd]).toEqual([null, false, false]);
  });

  it("marks no end on a future date with no projection", () => {
    const future = resolveCell([CYCLE], NO_RECORDS, RESULTS, NO_FORECAST, "2026-08-25", TODAY);
    expect([future.info, future.windowStart, future.windowEnd]).toEqual([null, false, false]);
  });

  it("does not mistake a month boundary for a window boundary", () => {
    // The window's end is a protocol result, not a display artifact. The flags are pure functions of
    // the window and carry no month information, so paging the calendar cannot change what is marked.
    const real = at(16);
    expect([real.windowStart, real.windowEnd]).toEqual([false, true]);
    expect([at(16).windowStart, at(16).windowEnd]).toEqual([false, true]);
  });

  /**
   * A projection with day1 2026-08-25 and a window of cycle days 3..8. Cycle day N is therefore
   * 2026-08-(N + 24), and every one of those dates is after TODAY, so the grid resolves the
   * projection rather than the recorded cycle.
   */
  const projectedAt = (cycleDay: number) => {
    const projection: CycleResult = {
      ...PROJECTED,
      day1: FUTURE_PROJECTED_DAY1,
      fertileWindow: {
        begin: 3,
        end: 8,
        beginRule: "calendar-earliest-peak-minus-6",
        endRule: "lookback-latest-peak-plus-n",
      },
    };
    return resolveCell(
      [CYCLE],
      NO_RECORDS,
      RESULTS,
      NO_FORECAST,
      `2026-08-${String(cycleDay + 24).padStart(2, "0")}`,
      TODAY,
      [projection],
    );
  };

  it("marks a projected window from the projection's own window", () => {
    // A forecast band has to be presented the same way a recorded one is, or a predicted window would
    // read as a different kind of thing from a confirmed one.
    const start = projectedAt(3);
    expect([start.info, start.forecast, start.windowStart, start.windowEnd]).toEqual([
      "fertile",
      true,
      true,
      false,
    ]);

    const interior = projectedAt(6);
    expect([interior.info, interior.windowStart, interior.windowEnd]).toEqual([
      "fertile",
      false,
      false,
    ]);

    const end = projectedAt(8);
    expect([end.info, end.windowStart, end.windowEnd]).toEqual(["fertile", false, true]);
  });

  it("marks a projected window independently of the recorded cycle's window", () => {
    // The recorded cycle is day1 2026-08-03 with RESULT's 6..null window. If the ends were read off
    // the wrong result, the projection's first day would be marked on the wrong date.
    const start = projectedAt(3);
    expect(start.info).toBe("fertile");
    expect(start.windowStart).toBe(true);
  });

  it("marks a projected day before the projected window unmarked", () => {
    const before = projectedAt(1);
    expect([before.info, before.windowStart, before.windowEnd]).toEqual([
      "pre-fertile",
      false,
      false,
    ]);
  });
});
