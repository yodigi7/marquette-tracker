// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addDays } from "../dateUtils";
import { computeCycle } from "../marquette";
import { CYCLE_LENGTH_MAX, CYCLE_LENGTH_MIN, DEFAULT_HISTORY_WINDOW } from "../marquette";
import { computePredictions } from "../predict";
import { PROTOCOL_DEFAULT_WINDOW_BEGIN, PROTOCOL_DEFAULT_WINDOW_END } from "../projection";
import type {
  CycleHistory,
  CycleInput,
  CycleResult,
  DayRecordInput,
  EngineSettings,
} from "../types";

const TODAY = "2026-06-01";

function settings(): EngineSettings {
  return {
    historyWindow: DEFAULT_HISTORY_WINDOW,
    cycleMinLength: CYCLE_LENGTH_MIN,
    cycleMaxLength: CYCLE_LENGTH_MAX,
  };
}

function emptyHistory(): CycleHistory {
  return { firstPeaksByCycle: [], lastPeaksByCycle: [], cycleNos: [] };
}

function result(
  cycleNo: number,
  day1: string,
  length: number | null,
  peakDay: number | null,
): CycleResult {
  return resultWithPeakRun(cycleNo, day1, length, peakDay === null ? null : [peakDay]);
}

/** A cycle whose monitor showed Peak on every day of `run`, as the device does for a minimum of two. */
function resultWithPeakRun(
  cycleNo: number,
  day1: string,
  length: number | null,
  run: number[] | null,
): CycleResult {
  const start = "2026-01-01";
  const records: DayRecordInput[] = [];
  if (run !== null && run.length > 0) {
    const last = run[run.length - 1];
    for (let day = 1; day <= last; day++) {
      records.push({
        id: `c${cycleNo}-d${day}`,
        cycleId: `c${cycleNo}`,
        date: addDays(start, day - 1),
        dayInCycle: day,
        monitor: run.includes(day) ? "peak" : "low",
      });
    }
  } else {
    records.push({
      id: `c${cycleNo}-d`,
      cycleId: `c${cycleNo}`,
      date: addDays(start, 5),
      dayInCycle: 6,
      monitor: "high",
    });
  }
  const cycle: CycleInput = { id: `c${cycleNo}`, day1 };
  return computeCycle(cycle, records, cycleNo, length, emptyHistory(), settings(), "2026-06-01");
}

describe("predict computePredictions", () => {
  it("returns null without any closed cycles", () => {
    expect(computePredictions([], settings(), TODAY)).toBeNull();
  });

  it("computes mean, median, min/max of cycle lengths (fixture 26,28,27,30,29)", () => {
    const cycles = [
      result(1, "2026-01-01", 26, 14),
      result(2, "2026-01-27", 28, 15),
      result(3, "2026-02-24", 27, 13),
      result(4, "2026-03-23", 30, 16),
      result(5, "2026-04-22", 29, 14),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY);
    expect(forecast).not.toBeNull();
    expect(forecast!.meanLength).toBe(28);
    expect(forecast!.medianLength).toBe(28);
    expect(forecast!.earliestLength).toBe(26);
    expect(forecast!.latestLength).toBe(30);
    expect(forecast!.basedOnCycles).toBe(5);
    expect(forecast!.firstPeakDayEarliest).toBe(13);
    expect(forecast!.firstPeakDayLatest).toBe(16);
  });

  it("projects expected period start from the newest cycle day1 plus the shared median", () => {
    const cycles = [result(1, "2026-01-01", 28, 14), result(2, "2026-02-01", 28, 15)];
    const forecast = computePredictions(cycles, settings(), TODAY);
    expect(forecast!.expectedPeriodStart).toBe("2026-03-01");
  });

  it("predicts the next fertile window via calendar rule (earliest peak -6 / latest +3)", () => {
    const cycles = [
      result(1, "2026-01-01", 28, 14),
      result(2, "2026-01-29", 28, 15),
      result(3, "2026-02-26", 28, 12),
      result(4, "2026-03-26", 30, 16),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY);
    // Newest day1 = 2026-03-26; earliest peak 12 → begin day 6 → date 2026-03-31
    // latest peak 16 + 3 = 19 → date 2026-04-13
    expect(forecast!.nextFertileWindow.begin).toBe("2026-03-31");
    expect(forecast!.nextFertileWindow.end).toBe("2026-04-13");
  });

  it("excludes mucus-only Peak cycles from historical peak statistics", () => {
    const mucusOnly = computeCycle(
      { id: "c1", day1: "2026-01-01" },
      [
        { id: "c1-d1", cycleId: "c1", date: "2026-01-01", dayInCycle: 1, bloodFlow: "medium" },
        { id: "c1-d16", cycleId: "c1", date: "2026-01-16", dayInCycle: 16, mucus: "peak" },
      ],
      1,
      28,
      emptyHistory(),
      settings(),
      "2026-06-01",
    );
    expect(mucusOnly.firstPeakDay).toBeNull();
    expect(mucusOnly.lastPeakDay).toBeNull();
    expect(mucusOnly.peakSource).toBe("none");

    const cycles = [mucusOnly, result(2, "2026-01-29", 28, 15)];
    const forecast = computePredictions(cycles, settings(), TODAY);
    expect(forecast!.firstPeakDayEarliest).toBe(15);
    expect(forecast!.firstPeakDayLatest).toBe(15);
  });

  it("excludes mucus-only cycles from historical peak statistics", () => {
    const forecast = computePredictions([result(1, "2026-01-01", 28, 15)], settings(), TODAY);
    expect(forecast!.firstPeakDayEarliest).toBe(15);
    expect(forecast!.firstPeakDayLatest).toBe(15);
  });

  it("counts out-of-band cycles", () => {
    const cycles = [
      result(1, "2026-01-01", 20, 10),
      result(2, "2026-01-21", 48, 20),
      result(3, "2026-03-10", 28, 14),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY);
    expect(forecast!.outOfBandCount).toBe(2);
  });

  it("handles a single closed cycle", () => {
    const cycles = [result(1, "2026-01-01", 28, 14)];
    const forecast = computePredictions(cycles, settings(), TODAY);
    expect(forecast!.expectedPeriodStart).toBe("2026-01-29");
    expect(forecast!.nextFertileWindow.begin).toBe("2026-01-08");
    expect(forecast!.nextFertileWindow.end).toBe("2026-01-17");
  });
});
describe("the reported Peak-day range is the one the calendar rule used", () => {
  // The window begin and end are derived from the Peak days inside the configured history window.
  // A surface reporting "your expected Peak day is X to Y" must therefore report *those* days, not a
  // statistic over every cycle the user has ever recorded. These cases pin both halves: the range is
  // window-scoped, and the all-cycles pair that History reports keeps its own wider meaning.
  it("reports the range the window was derived from", () => {
    const cycles = [
      result(1, "2026-01-01", 28, 12),
      result(2, "2026-01-29", 28, 16),
      result(3, "2026-02-26", 28, 17),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    expect(forecast.peakDayRangeInWindow).toEqual({ earliest: 12, latest: 17, cycles: 3 });
    // The dates the range produced, so the two cannot drift apart.
    const newest = cycles[cycles.length - 1];
    expect(forecast.nextFertileWindow.begin).toBe(addDays(newest.day1, 12 - 6 - 1));
    expect(forecast.nextFertileWindow.end).toBe(addDays(newest.day1, 17 + 3 - 1));
  });

  it("does not widen to cycles outside the configured window", () => {
    const peakDays = [11, 12, 13, 14, 16, 18, 19, 20, 21, 22];
    const cycles = peakDays.map((peak, index) =>
      result(index + 1, addDays("2026-01-01", index * 28), 28, peak),
    );
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    // Only the most recent six cycles feed the rule, so the range starts at 16.
    expect(forecast.peakDayRangeInWindow).toEqual({ earliest: 16, latest: 22, cycles: 6 });
    expect(forecast.peakDayRangeInWindow!.earliest).not.toBe(11);

    // The all-cycles pair is a different statistic and is deliberately unchanged: History reports it.
    expect(forecast.firstPeakDayEarliest).toBe(11);
    expect(forecast.firstPeakDayLatest).toBe(22);
  });

  it("reports only the cycles that actually carried a Peak", () => {
    const cycles = [
      result(1, "2026-01-01", 28, null),
      result(2, "2026-01-29", 28, 14),
      result(3, "2026-02-26", 28, 15),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    expect(forecast.lookbackWindow).toBe(3);
    expect(forecast.peakDayRangeInWindow).toEqual({ earliest: 14, latest: 15, cycles: 2 });
  });

  it("reports no range when the window holds no monitor Peak", () => {
    const cycles = [result(1, "2026-01-01", 28, null), result(2, "2026-01-29", 28, null)];
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    expect(forecast.peakDayRangeInWindow).toBeNull();
    // The window still has a determinate end, from the protocol default band.
    expect(forecast.nextFertileWindow.begin).toBe(
      addDays(cycles[1].day1, PROTOCOL_DEFAULT_WINDOW_BEGIN - 1),
    );
  });

  it("reports no averaged Peak day alongside the range", () => {
    const cycles = [result(1, "2026-01-01", 28, 12), result(2, "2026-01-29", 28, 16)];
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    const reported = Object.entries(forecast.peakDayRangeInWindow ?? {}).map(([key]) => key);
    expect(reported.sort()).toEqual(["cycles", "earliest", "latest"]);
  });
});

describe("the forecast window takes each edge from its own reading", () => {
  // A monitor shows Peak for a minimum of two days, so a cycle normally has a *first* reading and a
  // *last* reading. The calendar begin is derived from the first, the end from the last, and the two
  // are not interchangeable.

  it("opens from the earliest first-Peak and closes from the latest last-Peak", () => {
    const cycles = [
      resultWithPeakRun(1, "2026-01-01", 28, [12, 13]),
      resultWithPeakRun(2, "2026-01-29", 28, [15, 16]),
      resultWithPeakRun(3, "2026-02-26", 28, [12, 13]),
      resultWithPeakRun(4, "2026-03-26", 30, [16, 17]),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    // first-Peaks 12 15 12 16 -> 12 - 6 = day 6. last-Peaks 13 16 13 17 -> 17 + 3 = day 20.
    const day1 = cycles[3].day1;
    expect(forecast.nextFertileWindow.begin).toBe(addDays(day1, 6 - 1));
    expect(forecast.nextFertileWindow.end).toBe(addDays(day1, 20 - 1));
  });

  it("does not close on the earliest first-Peak's second day", () => {
    const cycles = [
      resultWithPeakRun(1, "2026-01-01", 28, [12, 13]),
      resultWithPeakRun(2, "2026-01-29", 28, [16, 17]),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    // A first-reading-only measurement would end on 12 + 3 = 15.
    expect(forecast.nextFertileWindow.end).toBe(addDays(cycles[1].day1, 17 + 3 - 1));
    expect(forecast.nextFertileWindow.end).not.toBe(addDays(cycles[1].day1, 12 + 3 - 1));
  });

  it("reports the range from the first reading of each cycle", () => {
    const cycles = [
      resultWithPeakRun(1, "2026-01-01", 28, [12, 13]),
      resultWithPeakRun(2, "2026-01-29", 28, [16, 17]),
      resultWithPeakRun(3, "2026-02-26", 28, [12, 13]),
    ];
    const forecast = computePredictions(cycles, settings(), TODAY)!;

    // 12..16 from first readings; 13..17 from last readings.
    expect(forecast.peakDayRangeInWindow).toEqual({ earliest: 12, latest: 16, cycles: 3 });
    expect(forecast.firstPeakDayEarliest).toBe(12);
    expect(forecast.firstPeakDayLatest).toBe(16);
  });

  it("does not widen when only a later reading of a run moves", () => {
    const before = computePredictions(
      [resultWithPeakRun(1, "2026-01-01", 28, [12, 13])],
      settings(),
      TODAY,
    )!;
    const after = computePredictions(
      [resultWithPeakRun(1, "2026-01-01", 28, [12, 14])],
      settings(),
      TODAY,
    )!;

    expect(after.firstPeakDayEarliest).toBe(before.firstPeakDayEarliest);
    expect(after.peakDayRangeInWindow!.latest).toBe(before.peakDayRangeInWindow!.latest);
    // The end does move, because the end is measured from the last reading.
    expect(after.nextFertileWindow.end).not.toBe(before.nextFertileWindow.end);
  });
});

describe("protocol default band is shared with the projection", () => {
  it("uses the same constants in the no-peaks forecast fallback", () => {
    // one protocol default, not two literals that happen to agree: if the
    // shared constants move, both surfaces move together
    const cycle = result(1, "2026-01-01", 28, null);
    const forecast = computePredictions([cycle], settings(), TODAY)!;

    const day1 = cycle.day1;
    expect(forecast.nextFertileWindow.begin).toBe(addDays(day1, PROTOCOL_DEFAULT_WINDOW_BEGIN - 1));
    expect(forecast.nextFertileWindow.end).toBe(addDays(day1, PROTOCOL_DEFAULT_WINDOW_END - 1));
  });

  it("closes the no-peaks fallback on day 16, one day past the earliest first-Peak plus three", () => {
    // Day 12 is the earliest possible *first* Peak day. The monitor then shows at least one more Peak
    // day, so the earliest possible *last* Peak day is 13 and the earliest end is 16.
    const cycle = result(1, "2026-01-01", 28, null);
    const forecast = computePredictions([cycle], settings(), TODAY)!;

    expect(PROTOCOL_DEFAULT_WINDOW_END).toBe(16);
    expect(forecast.nextFertileWindow.end).toBe(addDays(cycle.day1, 16 - 1));
  });

  it("keeps the calendar rule distinct from the default band", () => {
    // the `- 6` in the calendar rule is a different protocol fact that
    // coincidentally shares the value 6, so the two must not be conflated
    const cycle = result(1, "2026-01-01", 28, 14);
    const forecast = computePredictions([cycle], settings(), TODAY)!;

    // earliest peak 14 - 6 = day 8, not the default band's day 6
    expect(forecast.nextFertileWindow.begin).toBe(addDays(cycle.day1, 7));
    expect(forecast.nextFertileWindow.begin).not.toBe(
      addDays(cycle.day1, PROTOCOL_DEFAULT_WINDOW_BEGIN - 1),
    );
  });
});
