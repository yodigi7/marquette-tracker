// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addDays } from "../dateUtils";
import {
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  DEFAULT_EARLIEST_PEAK,
  DEFAULT_HISTORY_WINDOW,
  DEFAULT_POST_PEAK_DAYS,
  MIN_PEAK_RUN_DAYS,
} from "../marquette";
import { computeCycle } from "../marquette";
import { computePredictions } from "../predict";
import {
  estimateProjectedLength,
  PROTOCOL_DEFAULT_WINDOW_BEGIN,
  PROTOCOL_DEFAULT_WINDOW_END,
  projectCycles,
} from "../projection";
import type { CycleHistory, CycleResult, EngineSettings } from "../types";

// The canonical table from the spec: one atypical 45-day cycle that a mean
// would let dominate (31.2) and a median shrugs off (29).
const LENGTHS = [26, 28, 29, 29, 30, 45];

function settings(overrides: Partial<EngineSettings> = {}): EngineSettings {
  return {
    historyWindow: DEFAULT_HISTORY_WINDOW,
    cycleMinLength: CYCLE_LENGTH_MIN,
    cycleMaxLength: CYCLE_LENGTH_MAX,
    ...overrides,
  };
}

function emptyHistory(): CycleHistory {
  return { firstPeaksByCycle: [], lastPeaksByCycle: [], cycleNos: [] };
}

function closedCycle(
  cycleNo: number,
  day1: string,
  length: number,
  peakDay: number | null,
): CycleResult {
  const records = [];
  if (peakDay !== null) {
    records.push({
      id: `c${cycleNo}-peak`,
      cycleId: `c${cycleNo}`,
      date: addDays(day1, peakDay - 1),
      dayInCycle: peakDay,
      monitor: "peak" as const,
    });
  }
  return computeCycle(
    { id: `c${cycleNo}`, day1 },
    records,
    cycleNo,
    length,
    emptyHistory(),
    settings(),
    day1,
  );
}

function openCycle(
  cycleNo: number,
  day1: string,
  peakDay: number | null,
  today: string,
): CycleResult {
  const records = [];
  if (peakDay !== null) {
    records.push({
      id: `c${cycleNo}-peak`,
      cycleId: `c${cycleNo}`,
      date: addDays(day1, peakDay - 1),
      dayInCycle: peakDay,
      monitor: "peak" as const,
    });
  }
  return computeCycle(
    { id: `c${cycleNo}`, day1 },
    records,
    cycleNo,
    null,
    emptyHistory(),
    settings(),
    today,
  );
}

// Eight closed cycles, so the projection is past the protocol's six-cycle
// threshold and the calendar rule is the applicable branch. Peaks span
// 12..17 so the lookback window's min/max is 12/17.
const PEAKS = [12, 13, 16, 17, 12, 13, 16, 17];
const CLOSED_LENGTHS = [28, 28, 28, 28, 28, 28, 28, 28];

function eightClosedCycles(): CycleResult[] {
  const cycles: CycleResult[] = [];
  let day1 = "2026-01-01";
  for (let i = 0; i < 8; i++) {
    cycles.push(closedCycle(i + 1, day1, CLOSED_LENGTHS[i], PEAKS[i]));
    day1 = addDays(day1, CLOSED_LENGTHS[i]);
  }
  return cycles;
}

/** `peaks.length` closed 28-day cycles from 2026-01-01, carrying exactly the given Peak days. */
function closedCyclesWith(peaks: (number | null)[]): CycleResult[] {
  const cycles: CycleResult[] = [];
  let day1 = "2026-01-01";
  for (let [index, peak] of peaks.entries()) {
    cycles.push(closedCycle(index + 1, day1, 28, peak));
    day1 = addDays(day1, 28);
  }
  return cycles;
}

/**
 * Closed 28-day cycles whose monitor showed Peak on every day of `run`, as the device does for a
 * minimum of two days. The two edges of a projected window come from different readings, so the
 * projection has to be exercised against runs rather than single days.
 */
function closedCyclesWithPeakRuns(runsPerCycle: (number[] | null)[]): CycleResult[] {
  const cycles: CycleResult[] = [];
  let day1 = "2026-01-01";
  for (const [index, run] of runsPerCycle.entries()) {
    const records = (run ?? []).map((day) => ({
      id: `c${index + 1}-peak-${day}`,
      cycleId: `c${index + 1}`,
      date: addDays(day1, day - 1),
      dayInCycle: day,
      monitor: "peak" as const,
    }));
    cycles.push(
      computeCycle(
        { id: `c${index + 1}`, day1 },
        records,
        index + 1,
        28,
        emptyHistory(),
        settings(),
        day1,
      ),
    );
    day1 = addDays(day1, 28);
  }
  return cycles;
}

/**
 * Eight closed cycles ending in the five given Peak days, so that with one open cycle after them
 * those five are exactly the configured lookback window. Three older cycles stand in front so the
 * window lands on the five given, rather than on the tail of a shorter list where the open cycle's
 * own absent Peak would take a slot.
 */
function withLookbackPeaks(peaks: number[]): CycleResult[] {
  return closedCyclesWith([11, 11, 11, ...peaks]);
}

const OPEN_DAY1 = "2026-09-01";
const TODAY = "2026-09-20";

describe("estimateProjectedLength", () => {
  it("uses the median of the lookback window, not the mean", () => {
    // mean would be 31.2; the spec pins 29.
    expect(estimateProjectedLength(LENGTHS, 1, 6)).toBe(29);
  });

  it("honours the configured history window as the lookback count", () => {
    // window 3 -> [29, 30, 45] -> median 30, not the 6-cycle median of 29.
    expect(estimateProjectedLength(LENGTHS, 1, 3)).toBe(30);
    expect(estimateProjectedLength(LENGTHS, 1, 6)).toBe(29);
  });

  it("returns null when there is no closed cycle", () => {
    expect(estimateProjectedLength([], 1, 6)).toBeNull();
  });

  it("conditions on cycles that could still be running", () => {
    // day 30 -> only 30 and 45 remain eligible -> median 37.5 -> 38.
    expect(estimateProjectedLength(LENGTHS, 30, 6)).toBe(38);
  });

  it("drops shorter prior cycles out as the cycle runs", () => {
    const conditioned = estimateProjectedLength(LENGTHS, 30, 6);
    const unconditioned = estimateProjectedLength(LENGTHS, 1, 6);
    expect(conditioned).not.toBe(unconditioned);
    // the 26/28/29s no longer influence the result
    expect(conditioned).toBeGreaterThan(30);
  });

  it("does not produce an elapsed length for a late cycle", () => {
    const length = estimateProjectedLength(LENGTHS, 30, 6);
    expect(length).not.toBeNull();
    expect(length!).toBeGreaterThanOrEqual(30);
  });

  it("falls back to the unconditioned median below the two-sample floor", () => {
    // day 36 -> only 45 eligible (1 sample) -> fall back to the window median.
    expect(estimateProjectedLength(LENGTHS, 36, 6)).toBe(29);
  });

  it("rounds a fractional median to whole days", () => {
    // [30, 45] median is 37.5; a cycle length is a whole number of days.
    expect(estimateProjectedLength(LENGTHS, 30, 6)).toBe(38);
    expect(Number.isInteger(estimateProjectedLength(LENGTHS, 30, 6)!)).toBe(true);
  });

  it("treats a history window below one as one", () => {
    expect(estimateProjectedLength(LENGTHS, 1, 0)).toBe(45);
  });
});

describe("projectCycles chain", () => {
  it("gives the open cycle a projected length", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    expect(projected.length).toBeGreaterThan(0);
    // first link IS the open cycle, extended past today
    expect(projected[0].day1).toBe(OPEN_DAY1);
    expect(projected[0].length).toBe(28);
    // covers 1 Sep through 28 Sep inclusive
    const lastDay = projected[0].days[projected[0].days.length - 1];
    expect(lastDay.date).toBe("2026-09-28");
  });

  it("projects the open cycle tail past today", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    const tailDates = projected[0].days.filter((d) => d.date > TODAY);
    expect(tailDates.length).toBe(8); // 21 Sep .. 28 Sep
    expect(tailDates[0].date).toBe("2026-09-21");
  });

  it("starts the next projected cycle the day after the previous ends", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2026-12-31");

    expect(projected[1].day1).toBe("2026-09-29");
    expect(projected[0].length).toBe(28);
  });

  it("leaves no date outside every cycle", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const until = "2027-03-31";
    const projected = projectCycles(cycles, settings(), TODAY, until);

    const owner = new Map<string, number>();
    for (const cycle of projected) {
      for (const day of cycle.days) {
        owner.set(day.date, (owner.get(day.date) ?? 0) + 1);
      }
    }

    // walk every date from today to the horizon
    for (let date = TODAY; date <= until; date = addDays(date, 1)) {
      expect(owner.get(date), `unowned date ${date}`).toBe(1);
    }
  });

  it("never overlaps two projected cycles on one date", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2027-06-30");

    const seen = new Set<string>();
    for (const cycle of projected) {
      for (const day of cycle.days) {
        expect(seen.has(day.date), `overlap at ${day.date}`).toBe(false);
        seen.add(day.date);
      }
    }
  });

  it("continues past a single additional cycle with no fixed maximum", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    // three years out
    const projected = projectCycles(cycles, settings(), TODAY, "2029-09-30");
    expect(projected.length).toBeGreaterThan(30);
  });

  it("computes only as far as the caller asks", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const near = projectCycles(cycles, settings(), TODAY, "2026-10-15");
    const far = projectCycles(cycles, settings(), TODAY, "2028-01-01");
    expect(near.length).toBeLessThan(far.length);
  });

  it("produces nothing without a closed cycle", () => {
    const cycles = [openCycle(1, OPEN_DAY1, null, TODAY)];
    expect(projectCycles(cycles, settings(), TODAY, "2027-01-01")).toEqual([]);
  });

  it("produces nothing when the newest cycle is already closed", () => {
    const cycles = eightClosedCycles();
    expect(projectCycles(cycles, settings(), TODAY, "2027-01-01")).toEqual([]);
  });
});

describe("projectCycles protocol band ceiling", () => {
  // Open cycle day 42 is 2026-10-12, day 43 is 2026-10-13.
  const DAY_42 = "2026-10-12";
  const DAY_43 = "2026-10-13";

  it("stops once the open cycle is at or beyond the maximum length", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_43)];
    expect(projectCycles(cycles, settings(), DAY_43, "2027-06-30")).toEqual([]);
  });

  it("still projects on the last day inside the ceiling", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_42)];
    const projected = projectCycles(cycles, settings(), DAY_42, "2027-01-31");
    expect(projected.length).toBeGreaterThan(0);
    // no closed cycle reached 42 days, so the sample is too thin to condition on
    expect(projected[0].length).toBeGreaterThanOrEqual(42);
  });

  it("never projects a cycle end before today", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_42)];
    const projected = projectCycles(cycles, settings(), DAY_42, "2027-01-31");
    const first = projected[0];
    const lastDate = first.days[first.days.length - 1].date;
    expect(lastDate >= DAY_42).toBe(true);
  });

  it("never lets a thin sample end the open cycle before today", () => {
    // all closed cycles are short, so conditioning has nothing eligible
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, DAY_42)];
    const projected = projectCycles(cycles, settings(), DAY_42, "2027-01-31");
    expect(projected[0].length).toBeGreaterThanOrEqual(42);
  });
});

describe("projectCycles fertile window", () => {
  it("brackets the historical Peak range via the calendar rule", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    // lookback min peak 12 -> begin 6; max peak 17 + 3 -> end 20
    expect(projected[0].fertileWindow).toMatchObject({
      begin: 6,
      end: 20,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "lookback-latest-peak-plus-n",
    });
  });

  it("moves the projected end with the lookback's latest Peak", () => {
    const endWith = (latest: number) =>
      projectCycles(
        [...withLookbackPeaks([12, 13, 14, 15, latest]), openCycle(9, OPEN_DAY1, null, TODAY)],
        settings(),
        TODAY,
        "2026-10-31",
      )[0].fertileWindow.end;

    // The post-Peak interval is the protocol's, so the end is the latest lookback Peak plus three.
    expect(endWith(17)).toBe(17 + DEFAULT_POST_PEAK_DAYS);
    expect(endWith(19)).toBe(19 + DEFAULT_POST_PEAK_DAYS);
  });

  it("moves the projected begin with the lookback's earliest Peak", () => {
    const beginWith = (earliest: number) =>
      projectCycles(
        [...withLookbackPeaks([earliest, 16, 17, 18, 20]), openCycle(9, OPEN_DAY1, null, TODAY)],
        settings(),
        TODAY,
        "2026-10-31",
      )[0].fertileWindow.begin;

    expect(beginWith(12)).toBe(6);
    expect(beginWith(14)).toBe(8);
  });

  it("gives a projected cycle no Peak evidence and no ovulation point estimate", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    for (const cycle of projected) {
      expect(cycle.firstPeakDay).toBeNull();
      expect(cycle.lastPeakDay).toBeNull();
      expect(cycle.peakSource).toBe("none");
    }
  });

  it("paints post-window days as after the window, not fertile to the cycle end", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    const first = projected[0];
    expect(first.fertileWindow.end).toBe(20);
    const day21 = first.days.find((d) => d.day === 21)!;
    expect(day21.status).not.toBe("fertile");
  });

  it("falls back to the composed protocol window when the lookback holds no Peak", () => {
    // closed cycles but the user never logged a monitor Peak
    const noPeaks: CycleResult[] = [];
    let day1 = "2026-01-01";
    for (let i = 0; i < 8; i++) {
      noPeaks.push(closedCycle(i + 1, day1, 28, null));
      day1 = addDays(day1, 28);
    }
    noPeaks.push(openCycle(9, OPEN_DAY1, null, TODAY));

    const projected = projectCycles(noPeaks, settings(), TODAY, "2026-10-31");
    expect(projected.length).toBeGreaterThan(0);

    // The end is the composition, asserted from the constants rather than as a literal, so a change
    // to either protocol constant moves the expectation instead of silently diverging from it.
    // Day 12 is the earliest possible *first* Peak day; the monitor then shows at least one more
    // Peak day, so the earliest possible *last* Peak day is 13 and the earliest end is 16.
    const composed = DEFAULT_EARLIEST_PEAK + (MIN_PEAK_RUN_DAYS - 1) + DEFAULT_POST_PEAK_DAYS;
    expect(PROTOCOL_DEFAULT_WINDOW_END).toBe(composed);
    expect(PROTOCOL_DEFAULT_WINDOW_END).toBe(16);
    expect(projected[0].fertileWindow).toMatchObject({
      begin: PROTOCOL_DEFAULT_WINDOW_BEGIN,
      end: composed,
      endRule: "protocol-fallback-window",
    });
    // bounded window, not fertile to the end of the cycle
    expect(projected[0].fertileWindow.end).not.toBeNull();
    expect(projected[0].fertileWindow.end!).toBeLessThan(projected[0].length!);
    // days past the window are no longer painted fertile
    const past = projected[0].days.find((d) => d.day === PROTOCOL_DEFAULT_WINDOW_END + 1);
    expect(past?.status).not.toBe("fertile");
  });

  it("takes the open edge from a run's first reading and the close edge from its last", () => {
    // The calendar rule's "earliest peak day" is a cycle's first monitor Peak reading; the end rule is
    // defined through the last one. A lookback of two-day runs therefore opens a day earlier and closes
    // a day later than the same cycles measured from one reading would.
    // Three single-day cycles stand in front so the configured window lands on the five runs below
    // rather than on their tail, matching `withLookbackPeaks`.
    const cycles = [
      ...closedCyclesWithPeakRuns([
        [11],
        [11],
        [11],
        [12, 13],
        [14, 15],
        [16, 17],
        [18, 19],
        [20, 21],
      ]),
      openCycle(9, OPEN_DAY1, null, TODAY),
    ];

    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    // first-Peaks 12 14 16 18 20 -> 12 - 6 = 6. last-Peaks 13 15 17 19 21 -> 21 + 3 = 24.
    expect(projected[0].fertileWindow).toMatchObject({
      begin: 6,
      end: 21 + DEFAULT_POST_PEAK_DAYS,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "lookback-latest-peak-plus-n",
    });
  });

  it("does not open the window from a run's last reading", () => {
    // The same lookback with each run a day longer, so only the *later* readings move. The open edge
    // must not follow them: measuring from last readings would put the begin on day 8.
    const cycles = [
      ...closedCyclesWithPeakRuns([
        [11],
        [11],
        [11],
        [12, 13, 14],
        [14, 15, 16],
        [16, 17, 18],
        [18, 19, 20],
        [20, 21, 22],
      ]),
      openCycle(9, OPEN_DAY1, null, TODAY),
    ];

    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    // first-Peaks unchanged at 12 14 16 18 20 -> 6. min(last-Peaks) 14 would give 8.
    expect(projected[0].fertileWindow.begin).toBe(6);
    // The close edge does follow the last readings: 22 + 3 = 25.
    expect(projected[0].fertileWindow.end).toBe(22 + DEFAULT_POST_PEAK_DAYS);
  });

  it("does not close the window on a run's first reading", () => {
    const cycles = [
      ...closedCyclesWithPeakRuns([
        [11],
        [11],
        [11],
        [12, 13],
        [14, 15],
        [16, 17],
        [18, 19],
        [20, 21],
      ]),
      openCycle(9, OPEN_DAY1, null, TODAY),
    ];

    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    // A first-reading-only measurement would end on 20 + 3 = 23 rather than 21 + 3 = 24.
    expect(projected[0].fertileWindow.end).not.toBe(20 + DEFAULT_POST_PEAK_DAYS);
  });

  it("matches the real open cycle's end, because its own Peak is the last lookback entry", () => {
    // `projected[0]` re-derives the open cycle from no readings, so its window is the calendar rule
    // over a lookback whose last element is the open cycle's own Peak. That makes the derived end
    // the real one, so a projection cannot contradict the cycle it stands in for.
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, 20, TODAY)];
    const real = cycles[cycles.length - 1];

    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");

    expect(real.firstPeakDay).toBe(20);
    expect(real.lastPeakDay).toBe(20);
    expect(real.fertileWindow.end).toBe(20 + DEFAULT_POST_PEAK_DAYS);
    expect(projected[0].fertileWindow).toMatchObject({
      begin: 6,
      end: 20 + DEFAULT_POST_PEAK_DAYS,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "lookback-latest-peak-plus-n",
    });
    // And the real cycle is untouched by the projection call.
    expect(cycles[cycles.length - 1].fertileWindow).toBe(real.fertileWindow);
    expect(real.fertileWindow.endRule).toBe("current-peak-plus-n");
  });
});

describe("the bounded fallback does not reach recorded cycles", () => {
  it("leaves a recorded cycle with no Peak history on an open window", () => {
    // cycles exist, so the projection runs...
    const cycles: CycleResult[] = [];
    let day1 = "2026-01-01";
    for (let i = 0; i < 8; i++) {
      cycles.push(closedCycle(i + 1, day1, 28, null));
      day1 = addDays(day1, 28);
    }
    const open = openCycle(9, OPEN_DAY1, null, TODAY);
    cycles.push(open);

    // ...but the recorded results handed in are returned untouched
    const before = cycles.map((c) => ({ ...c.fertileWindow }));
    const projected = projectCycles(cycles, settings(), TODAY, "2026-10-31");
    expect(projected.length).toBeGreaterThan(0);

    cycles.forEach((cycle, index) => {
      expect(cycle.fertileWindow).toEqual(before[index]);
      expect(cycle.fertileWindow.end).toBeNull();
      expect(cycle.fertileWindow.endRule).toBe("none");
      // Neither projection-only end rule reaches a cycle the user recorded.
      expect(cycle.fertileWindow.endRule).not.toBe("protocol-fallback-window");
      expect(cycle.fertileWindow.endRule).not.toBe("lookback-latest-peak-plus-n");
    });
  });
});

describe("projection and forecast agree", () => {
  it("reports the same next period start as the History forecast", () => {
    const cycles = [...eightClosedCycles(), openCycle(9, OPEN_DAY1, null, TODAY)];
    const projected = projectCycles(cycles, settings(), TODAY, "2026-12-31");
    const forecast = computePredictions(cycles, settings(), TODAY);

    const first = projected[0];
    const firstLastDay = first.days[first.days.length - 1].date;
    // the day after the projected tail is where the next cycle starts
    expect(addDays(firstLastDay, 1)).toBe(forecast!.expectedPeriodStart);
  });

  it("agrees for a late cycle where a mean would have gone backwards", () => {
    const cycles = [
      closedCycle(1, "2026-01-01", 26, 12),
      closedCycle(2, "2026-01-27", 28, 13),
      closedCycle(3, "2026-02-24", 29, 16),
      closedCycle(4, "2026-03-25", 29, 17),
      closedCycle(5, "2026-04-23", 30, 12),
      closedCycle(6, "2026-05-23", 45, 13),
      closedCycle(7, "2026-07-07", 28, 16),
      closedCycle(8, "2026-08-04", 28, 17),
      openCycle(9, "2026-09-01", null, TODAY),
    ];
    const projected = projectCycles(cycles, settings(), TODAY, "2027-03-31");
    const forecast = computePredictions(cycles, settings(), TODAY);

    const first = projected[0];
    const firstLastDay = first.days[first.days.length - 1].date;
    expect(addDays(firstLastDay, 1)).toBe(forecast!.expectedPeriodStart);
    // the mean would have produced a date already in the past
    expect(forecast!.expectedPeriodStart > TODAY).toBe(true);
  });
});
