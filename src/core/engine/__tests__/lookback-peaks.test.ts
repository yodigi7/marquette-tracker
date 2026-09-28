// @vitest-environment node
import { describe, expect, it } from "vitest";
import { computeAll } from "../engineSdk";
import { CYCLE_LENGTH_MAX, CYCLE_LENGTH_MIN, DEFAULT_HISTORY_WINDOW } from "../marquette";
import type { CycleInput, DayRecordInput, EngineSettings, LookbackPeak } from "../types";

/**
 * `lookbackPeaks` — the lookback monitor Peak days a cycle's calendar rule was derived from.
 *
 * The chart prints these so a window-begin claim on paper is checkable against paper. The begin day and
 * its rule must be byte-identical with and without the field, so the identity cases below are the load
 * bearing ones: this is an additive observability field, never an input to the window.
 */

function settings(overrides: Partial<EngineSettings> = {}): EngineSettings {
  return {
    historyWindow: DEFAULT_HISTORY_WINDOW,
    cycleMinLength: CYCLE_LENGTH_MIN,
    cycleMaxLength: CYCLE_LENGTH_MAX,
    ...overrides,
  };
}

/** Cycle N starts the month after cycle N-1, so every cycle closes and day numbering stays predictable. */
function cycleInputs(count: number): CycleInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i + 1}`,
    day1: `2026-${String(i + 1).padStart(2, "0")}-01`,
  }));
}

function peak(cycleId: string, dayInCycle: number): DayRecordInput {
  return {
    id: `${cycleId}-p`,
    cycleId,
    date: "2026-01-01",
    dayInCycle,
    monitor: "peak",
  };
}

/** A monitor reading placed on the given day; `dayInCycle` drives the rule, `date` is bookkeeping. */
function high(cycleId: string, dayInCycle: number): DayRecordInput {
  return {
    id: `${cycleId}-h${dayInCycle}`,
    cycleId,
    date: "2026-01-01",
    dayInCycle,
    monitor: "high",
  };
}

describe("CycleResult.lookbackPeaks", () => {
  it("pairs each lookback Peak day with the cycle it came from, oldest first", () => {
    const cycles = cycleInputs(7);
    const records = [peak("c2", 15), peak("c3", 12), peak("c4", 16), peak("c5", 14)];
    const result = computeAll(cycles, records, settings(), "2026-12-01");
    const target = result.cycles[6];

    expect(target.cycleNo).toBe(7);
    expect(target.fertileWindow.beginRule).toBe("calendar-earliest-peak-minus-6");
    expect(target.lookbackPeaks).toEqual<LookbackPeak[]>([
      { cycleNo: 2, peakDay: 15 },
      { cycleNo: 3, peakDay: 12 },
      { cycleNo: 4, peakDay: 16 },
      { cycleNo: 5, peakDay: 14 },
    ]);
  });

  it("is empty when the history window holds no monitor Peak to measure from", () => {
    const cycles = cycleInputs(7);
    // Seven cycles, none of which ever produced a Peak.
    const records = [high("c2", 9), high("c3", 10), high("c4", 11)];
    const result = computeAll(cycles, records, settings(), "2026-12-01");
    const target = result.cycles[6];

    expect(target.lookbackPeaks).toEqual([]);
    // The rule that ran is the day-6 fallback, and it is named as such.
    expect(target.fertileWindow.beginRule).toBe("calendar-day-6-fallback");
    expect(target.fertileWindow.begin).toBe(6);
  });

  it("takes the last historyWindow cycles, not the first", () => {
    // Eight prior cycles with Peaks. A window of 6 must reach back to cycles 3..8, so cycle 2's early
    // Peak of day 9 must NOT appear — if it did, the window would have been taken from the front.
    const cycles = cycleInputs(9);
    const records: DayRecordInput[] = [];
    const peakDays = [9, 20, 21, 22, 23, 24, 25, 26];
    for (let i = 0; i < 8; i++) {
      records.push(peak(`c${i + 1}`, peakDays[i]));
    }
    const result = computeAll(cycles, records, settings(), "2026-12-01");
    const target = result.cycles[8];

    expect(target.lookbackPeaks.map((p) => p.cycleNo)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(target.lookbackPeaks.map((p) => p.peakDay)).toEqual([21, 22, 23, 24, 25, 26]);
    // The window follows the Peak actually in the window, not the discarded earlier one.
    expect(target.fertileWindow.begin).toBe(21 - 6);
  });

  it("honours a widened history window", () => {
    const cycles = cycleInputs(9);
    const records: DayRecordInput[] = [];
    const peakDays = [9, 20, 21, 22, 23, 24, 25, 26];
    for (let i = 0; i < 8; i++) {
      records.push(peak(`c${i + 1}`, peakDays[i]));
    }
    const result = computeAll(cycles, records, settings({ historyWindow: 8 }), "2026-12-01");

    expect(result.cycles[8].lookbackPeaks.map((p) => p.cycleNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.cycles[8].fertileWindow.begin).toBe(9 - 6);
  });

  it("skips cycles in the window that recorded no Peak", () => {
    const cycles = cycleInputs(7);
    const records = [peak("c2", 15), peak("c5", 11)];
    const result = computeAll(cycles, records, settings(), "2026-12-01");
    const target = result.cycles[6];

    // Cycle 5's Peak of day 11 is the earliest in the window, so the begin follows it.
    expect(target.fertileWindow.begin).toBe(11 - 6);
    // A cycle with no Peak contributes nothing, rather than a null entry in the list.
    expect(target.lookbackPeaks).toEqual<LookbackPeak[]>([
      { cycleNo: 2, peakDay: 15 },
      { cycleNo: 5, peakDay: 11 },
    ]);
  });

  const nonCalendarRules: { name: string; cycleNo: number; records: DayRecordInput[] }[] = [
    { name: "cycles 1-6 take the day-6 rule", cycleNo: 4, records: [] },
    {
      name: "a begin set by the first High or Peak does not run the calendar rule",
      cycleNo: 7,
      records: [peak("c2", 15), peak("c3", 12), high("c7", 5)],
    },
  ];

  for (const rule of nonCalendarRules) {
    it(`carries no lookback Peaks when ${rule.name}`, () => {
      const cycles = cycleInputs(rule.cycleNo);
      const result = computeAll(cycles, rule.records, settings(), "2026-12-01");
      const target = result.cycles[rule.cycleNo - 1];

      expect(target.lookbackPeaks).toEqual([]);
    });
  }

  it("names a first-High begin as that rule, not the calendar rule", () => {
    const cycles = cycleInputs(7);
    const records = [peak("c2", 15), peak("c3", 12), high("c7", 5)];
    const result = computeAll(cycles, records, settings(), "2026-12-01");
    const target = result.cycles[6];

    // The calendar rule would have begun on day 6; the recorded High on day 5 pulls it earlier.
    expect(target.fertileWindow.begin).toBe(5);
    expect(target.fertileWindow.beginRule).toBe("first-high-or-peak");
    // It is still a begin the calendar rule did not produce, so there is no calendar evidence to print.
    expect(target.lookbackPeaks).toEqual([]);
  });

  it("does not change the computed window, begin, or end", () => {
    // Identity guard. Adding the field must be purely additive. Peaks sit on cycles 3 (day 12), 4 (day 14)
    // and 7 (day 13); the asserted windows are the ones the engine produced before this field existed.
    const cycles = cycleInputs(8);
    const records = [peak("c3", 12), peak("c4", 14), peak("c7", 13)];
    const result = computeAll(cycles, records, settings(), "2026-12-01");

    // Cycle 4 is inside the first six, so day 6 is the rule itself, and its own Peak closes the end.
    expect(result.cycles[3].fertileWindow).toEqual({
      begin: 6,
      end: 17,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
    });

    // Cycle 5 is still inside the first six, so the Peaks behind it change nothing. No own Peak, no end.
    expect(result.cycles[4].fertileWindow).toEqual({
      begin: 6,
      end: null,
      beginRule: "calendar-day-6",
      endRule: "none",
    });
    expect(result.cycles[4].lookbackPeaks).toEqual([]);

    // Cycle 8 is past the sixth, and its window holds cycles 3, 4 and 7 -> earliest day 12 -> begin day 6.
    // It has no Peak of its own, so the protocol defines no end for it.
    const eight = result.cycles[7];
    expect(eight.fertileWindow.beginRule).toBe("calendar-earliest-peak-minus-6");
    expect(eight.fertileWindow.begin).toBe(12 - 6);
    expect(eight.peakDay).toBeNull();
    expect(eight.fertileWindow.end).toBeNull();
    expect(eight.fertileWindow.endRule).toBe("none");
    expect(eight.lookbackPeaks).toEqual<LookbackPeak[]>([
      { cycleNo: 3, peakDay: 12 },
      { cycleNo: 4, peakDay: 14 },
      { cycleNo: 7, peakDay: 13 },
    ]);
  });

  it("is [] for a user with no cycles at all, without throwing", () => {
    const result = computeAll([], [], settings(), "2026-12-01");
    expect(result.cycles).toEqual([]);
  });
});
