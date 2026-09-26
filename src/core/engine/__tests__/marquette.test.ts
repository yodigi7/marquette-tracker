// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEFAULT_HISTORY_WINDOW,
  DEFAULT_POST_PEAK_DAYS,
  computeCycle,
  statusForCycleDay,
} from "../marquette";
import { computeAll } from "../engineSdk";
import { CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX } from "../marquette";
import type { CycleHistory, CycleInput, DayRecordInput, EngineSettings } from "../types";

function settings(overrides: Partial<EngineSettings> = {}): EngineSettings {
  return {
    historyWindow: DEFAULT_HISTORY_WINDOW,
    cycleMinLength: CYCLE_LENGTH_MIN,
    cycleMaxLength: CYCLE_LENGTH_MAX,
    ...overrides,
  };
}

function cycle(id: string | number = "c1"): CycleInput {
  return { id: String(id), day1: "2026-01-01" };
}

function record(
  cycleId: string | number,
  dayInCycle: number,
  overrides: Partial<DayRecordInput> = {},
): DayRecordInput {
  return {
    id: `${cycleId}-d${dayInCycle}`,
    cycleId: String(cycleId),
    date: `2026-01-${String(dayInCycle).padStart(2, "0")}`,
    dayInCycle,
    ...overrides,
  };
}

function emptyHistory(): CycleHistory {
  return { peaksByCycle: [], cycleNos: [] };
}

/** Fixed "today" for closed-cycle cases, where the open-cycle bound is inert. */
const TODAY = "2026-06-01";

function historyWithPeaks(peaks: (number | null)[]): CycleHistory {
  return { peaksByCycle: peaks, cycleNos: peaks.map((_, i) => i + 1) };
}

interface WindowExpectation {
  begin: number;
  end: number | null;
  beginRule: string;
  endRule: string;
}

interface Case {
  name: string;
  cycleNo: number;
  history?: CycleHistory;
  settings?: EngineSettings;
  records: DayRecordInput[];
  expect: WindowExpectation & {
    peakDay?: number | null;
    peakSource?: string;
    length?: number | null;
  };
}

const CASES: Case[] = [
  {
    name: "first cycle, peak on day 14: begin day 6, end 14+3",
    cycleNo: 1,
    records: [
      record("c1", 6, { monitor: "high" }),
      record("c1", 7, { monitor: "high" }),
      record("c1", 14, { monitor: "peak" }),
    ],
    expect: {
      begin: 6,
      end: 17,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
      peakDay: 14,
      peakSource: "monitor",
    },
  },
  {
    name: "first cycle, high on day 3: window opens at first high (day 3)",
    cycleNo: 1,
    records: [record(1, 3, { monitor: "high" }), record(1, 14, { monitor: "peak" })],
    expect: { begin: 3, end: 17, beginRule: "first-high-or-peak", endRule: "current-peak-plus-n" },
  },
  {
    name: "first cycle, peak on day 6: begin stays day 6",
    cycleNo: 1,
    records: [record(1, 6, { monitor: "peak" })],
    expect: { begin: 6, end: 9, beginRule: "calendar-day-6", endRule: "current-peak-plus-n" },
  },
  {
    name: "monitor peak day 12, mucus peak day 14: the monitor Peak is the only evidence",
    cycleNo: 2,
    records: [record(2, 12, { monitor: "peak" }), record(2, 14, { mucus: "peak" })],
    expect: {
      begin: 6,
      end: 15,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
      peakDay: 12,
      peakSource: "monitor",
    },
  },
  {
    name: "mucus-only peak is not Peak evidence and creates no window end",
    cycleNo: 2,
    records: [record(2, 16, { mucus: "peak" })],
    expect: {
      begin: 6,
      end: null,
      beginRule: "calendar-day-6",
      endRule: "none",
      peakDay: null,
      peakSource: "none",
    },
  },
  {
    name: "mucus observations do not move the window begin either",
    cycleNo: 1,
    records: [record(1, 2, { mucus: "peak" }), record(1, 14, { monitor: "peak" })],
    expect: {
      begin: 6,
      end: 17,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
      peakDay: 14,
      peakSource: "monitor",
    },
  },
  {
    name: "no peak in first six cycles: no end, no-peak-end warning",
    cycleNo: 1,
    records: [record(1, 8, { monitor: "high" })],
    expect: { begin: 6, end: null, beginRule: "calendar-day-6", endRule: "none" },
  },
  {
    name: "cycle 9 with history peaks [12,16,14,15,13,14]: calendar begin 6, current peak earlier",
    cycleNo: 9,
    history: historyWithPeaks([12, 16, 14, 15, 13, 14]),
    records: [record(9, 14, { monitor: "peak" })],
    expect: {
      begin: 6,
      end: 17,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "current-peak-plus-n",
    },
  },
  {
    name: "cycle 9: first high on day 4 beats calendar begin 6",
    cycleNo: 9,
    history: historyWithPeaks([12, 16, 14, 15, 13, 14]),
    records: [record(9, 4, { monitor: "high" }), record(9, 14, { monitor: "peak" })],
    expect: { begin: 4, end: 17, beginRule: "first-high-or-peak", endRule: "current-peak-plus-n" },
  },
  {
    name: "cycle 9: historic latest peak 16+3=19 ends before current 20+3=23 → earliest-end",
    cycleNo: 9,
    history: historyWithPeaks([12, 16, 14, 15, 13, 14]),
    records: [record(9, 20, { monitor: "peak" })],
    expect: {
      begin: 6,
      end: 19,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "earliest-end",
    },
  },
  {
    name: "cycle 9: current peak end 13 beats historic end 19",
    cycleNo: 9,
    history: historyWithPeaks([12, 16, 14, 15, 13, 14]),
    records: [record(9, 10, { monitor: "peak" })],
    expect: {
      begin: 6,
      end: 13,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "current-peak-plus-n",
    },
  },
  {
    name: "cycle 9 without peak falls back to historic latest peak + 3",
    cycleNo: 9,
    history: historyWithPeaks([12, 16, 14, 15, 13, 14]),
    records: [record(9, 10, { monitor: "high" })],
    expect: {
      begin: 6,
      end: 19,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "historic-peak-plus-n",
    },
  },
  {
    name: "repeat highs do not move the begin after its set",
    cycleNo: 1,
    records: [
      record(1, 5, { monitor: "high" }),
      record(1, 9, { monitor: "high" }),
      record(1, 12, { monitor: "peak" }),
      record(1, 15, { monitor: "peak" }),
    ],
    expect: {
      begin: 5,
      end: 18,
      beginRule: "first-high-or-peak",
      endRule: "current-peak-plus-n",
      peakDay: 15,
    },
  },
  {
    name: "records in scrambled order produce the same window",
    cycleNo: 1,
    records: [
      record(1, 14, { monitor: "peak" }),
      record(1, 3, { monitor: "high" }),
      record(1, 7, { mucus: "none" }),
    ],
    expect: { begin: 3, end: 17, beginRule: "first-high-or-peak", endRule: "current-peak-plus-n" },
  },
  {
    name: "cycle 9 without history at all: falls back to peak-12 minus 6 (day 6), ends peak+3",
    cycleNo: 9,
    records: [record(9, 15, { monitor: "peak" })],
    expect: {
      begin: 6,
      end: 18,
      beginRule: "calendar-earliest-peak-minus-6",
      endRule: "current-peak-plus-n",
    },
  },
  {
    name: "records without provenance count as user evidence",
    cycleNo: 1,
    records: [record(1, 14, { monitor: "peak" }), record(1, 21, { monitor: "peak" })],
    expect: {
      begin: 6,
      end: 24,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
      peakDay: 21,
      peakSource: "monitor",
    },
  },
];

describe("marquette computeCycle", () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      const result = computeCycle(
        cycle(testCase.cycleNo),
        testCase.records.map((r) => ({ ...r, cycleId: "c" + testCase.cycleNo })),
        testCase.cycleNo,
        testCase.expect.length ?? 28,
        testCase.history ?? emptyHistory(),
        testCase.settings ?? settings(),
        TODAY,
      );
      expect(result.fertileWindow.begin).toBe(testCase.expect.begin);
      expect(result.fertileWindow.end).toBe(testCase.expect.end);
      expect(result.fertileWindow.beginRule).toBe(testCase.expect.beginRule);
      expect(result.fertileWindow.endRule).toBe(testCase.expect.endRule);
      if (testCase.expect.peakDay !== undefined) {
        expect(result.peakDay).toBe(testCase.expect.peakDay);
      }
      if (testCase.expect.peakSource !== undefined) {
        expect(result.peakSource).toBe(testCase.expect.peakSource);
      }
      if (testCase.expect.end === null) {
        expect(result.warnings).toContainEqual({ kind: "no-peak-end", cycleNo: testCase.cycleNo });
      }
    });
  }

  it("uses a fixed three-day post-Peak protocol constant", () => {
    expect(DEFAULT_POST_PEAK_DAYS).toBe(3);
  });

  it("keeps the window fertile through P+3 and post-window from P+4", () => {
    const result = computeCycle(
      cycle(1),
      [record(1, 14, { monitor: "peak" })],
      1,
      28,
      emptyHistory(),
      settings(),
      TODAY,
    );

    expect(result.fertileWindow.end).toBe(17);
    expect(statusForCycleDay(result.fertileWindow, true, 17)).toBe("fertile");
    expect(statusForCycleDay(result.fertileWindow, true, 18)).toBe("post-peak");
  });

  it("assigns statuses across the whole window (first cycle, peak 14)", () => {
    const start = "2026-01-01";
    const records: DayRecordInput[] = Array.from({ length: 25 }, (_, i) => ({
      id: `c1-d${i + 1}`,
      cycleId: "c1",
      date: addDaysTo(start, i),
      dayInCycle: i + 1,
      monitor: i + 1 === 14 ? "peak" : "low",
    }));
    const result = computeCycle(
      { id: "c1", day1: start },
      records,
      1,
      28,
      emptyHistory(),
      settings(),
      TODAY,
    );
    const byStatus = new Map(result.days.map((d) => [d.day, d.status]));
    expect(byStatus.get(5)).toBe("pre-fertile");
    expect(byStatus.get(6)).toBe("fertile");
    expect(byStatus.get(17)).toBe("fertile");
    expect(byStatus.get(18)).toBe("post-peak");
    expect(byStatus.get(25)).toBe("post-peak");
  });

  it("does not treat Low-only records as Peak evidence or a fertile-window end", () => {
    const result = computeCycle(
      cycle(1),
      [record(1, 18, { monitor: "low" })],
      1,
      28,
      emptyHistory(),
      settings(),
      TODAY,
    );

    expect(result.peakDay).toBeNull();
    expect(result.peakSource).toBe("none");
    expect(result.fertileWindow.end).toBeNull();
    expect(result.fertileWindow.endRule).toBe("none");
    // No window end, so every day from the day-6 begin onward stays fertile.
    expect(result.days.find((d) => d.day === 6)?.status).toBe("fertile");
    expect(result.days.find((d) => d.day === 18)?.status).toBe("fertile");
  });

  it("returns day results across the whole cycle from a single Peak record", () => {
    const result = computeCycle(
      cycle(1),
      [record(1, 14, { monitor: "peak" })],
      1,
      28,
      emptyHistory(),
      settings(),
      TODAY,
    );

    expect(result.peakDay).toBe(14);
    expect(result.fertileWindow.end).toBe(17);
    // Day coverage is now derived, so the array spans the whole closed cycle.
    expect(result.days).toHaveLength(28);
    expect(result.days.find((d) => d.day === 18)?.status).toBe("post-peak");
  });

  it("statusForCycleDay extrapolates beyond recorded days", () => {
    const window = {
      begin: 6,
      end: 17,
      beginRule: "calendar-day-6" as const,
      endRule: "current-peak-plus-n" as const,
    };
    expect(statusForCycleDay(window, true, 5)).toBe("pre-fertile");
    expect(statusForCycleDay(window, true, 6)).toBe("fertile");
    expect(statusForCycleDay(window, true, 17)).toBe("fertile");
    expect(statusForCycleDay(window, true, 18)).toBe("post-peak");
    expect(statusForCycleDay(window, false, 18)).toBe("post-calendar");
    expect(statusForCycleDay({ ...window, end: null }, true, 40)).toBe("fertile");
  });

  describe("day results span the derived window", () => {
    const START = "2026-01-01";

    it("covers the whole fertile window when only the Peak is recorded", () => {
      const result = computeCycle(
        { id: "c1", day1: START },
        [record(1, 12, { monitor: "peak" })],
        1,
        28,
        emptyHistory(),
        settings(),
        "2026-01-20",
      );

      const byDay = new Map(result.days.map((d) => [d.day, d.status]));
      expect(result.fertileWindow.end).toBe(15);
      for (const day of [13, 14, 15]) {
        expect(byDay.get(day)).toBe("fertile");
      }
      expect(byDay.get(16)).toBe("post-peak");
    });

    it("covers days before the window begin with no records at all", () => {
      const result = computeCycle(
        { id: "c1", day1: START },
        [record(1, 12, { monitor: "peak" })],
        1,
        28,
        emptyHistory(),
        settings(),
        "2026-01-20",
      );

      const byDay = new Map(result.days.map((d) => [d.day, d.status]));
      for (const day of [1, 2, 3, 4, 5]) {
        expect(byDay.get(day)).toBe("pre-fertile");
      }
    });

    it("emits one result per day for a closed cycle regardless of records", () => {
      const result = computeCycle(
        { id: "c1", day1: START },
        [record(1, 12, { monitor: "peak" })],
        1,
        28,
        emptyHistory(),
        settings(),
        "2026-02-28",
      );

      expect(result.days).toHaveLength(28);
      expect(result.days.map((d) => d.day)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    });

    it("bounds an open cycle at the current day when no Peak is known", () => {
      const result = computeCycle(
        { id: "c1", day1: START },
        [],
        1,
        null,
        emptyHistory(),
        settings(),
        "2026-01-09",
      );

      expect(result.fertileWindow.end).toBeNull();
      expect(result.days).toHaveLength(9);
      const byDay = new Map(result.days.map((d) => [d.day, d.status]));
      expect(byDay.get(5)).toBe("pre-fertile");
      expect(byDay.get(6)).toBe("fertile");
      expect(byDay.get(9)).toBe("fertile");
    });

    it("never covers a day after the current day", () => {
      const result = computeCycle(
        { id: "c1", day1: START },
        [record(1, 30, { monitor: "peak" })],
        1,
        null,
        emptyHistory(),
        settings(),
        "2026-01-10",
      );

      expect(result.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(result.days.every((d) => d.day <= 10)).toBe(true);
    });

    it("emits no source, record identity, or data-origin value per day", () => {
      const result = computeCycle(
        { id: "c1", day1: START },
        [record(1, 12, { monitor: "peak" })],
        1,
        28,
        emptyHistory(),
        settings(),
        TODAY,
      );

      for (const day of result.days) {
        expect(Object.keys(day).sort()).toEqual(["date", "day", "status"]);
      }
    });

    it("covers the same days with or without records", () => {
      const withPeak = computeCycle(
        { id: "c1", day1: START },
        [record(1, 12, { monitor: "peak" })],
        1,
        28,
        emptyHistory(),
        settings(),
        TODAY,
      );
      const withoutRecords = computeCycle(
        { id: "c1", day1: START },
        [],
        1,
        28,
        emptyHistory(),
        settings(),
        TODAY,
      );

      // Coverage no longer varies with what is stored. Statuses still do,
      // because the Peak is evidence and an absent window end stays fertile.
      expect(withoutRecords.days).toHaveLength(withPeak.days.length);
      expect(withoutRecords.days.map((d) => d.date)).toEqual(withPeak.days.map((d) => d.date));
      expect(withoutRecords.days.find((d) => d.day === 20)?.status).toBe("fertile");
      expect(withPeak.days.find((d) => d.day === 20)?.status).toBe("post-peak");
    });
  });
});

function addDaysTo(start: string, n: number): string {
  const [y, m, d] = start.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

describe("cycle band configurability (band-shift)", () => {
  function cyclesOfLengths(lengths: number[]): CycleInput[] {
    const cycles: CycleInput[] = [];
    let day1 = "2026-01-01";
    for (let i = 0; i <= lengths.length; i++) {
      cycles.push({ id: `c${i + 1}`, day1 });
      if (i < lengths.length) {
        day1 = addDaysTo(day1, lengths[i]);
      }
    }
    return cycles;
  }

  function run(lengths: number[], band?: { min: number; max: number }) {
    const engineSettings = band
      ? settings({ cycleMinLength: band.min, cycleMaxLength: band.max })
      : settings();
    return computeAll(cyclesOfLengths(lengths), [], engineSettings, TODAY);
  }

  function outOfBandWarnings(out: ReturnType<typeof computeAll>) {
    return out.warnings.filter((w) => w.kind === "cycle-out-of-band");
  }

  it("default band 21-42 flags none of 28/30/32, outOfBandCount 0", () => {
    const out = run([28, 30, 32]);
    expect(outOfBandWarnings(out)).toHaveLength(0);
    expect(out.forecast?.outOfBandCount).toBe(0);
  });

  it("boundary: lengths equal to the band edge are in-band, one past it is out", () => {
    const inside = run([21, 42]);
    expect(outOfBandWarnings(inside)).toHaveLength(0);
    expect(inside.forecast?.outOfBandCount).toBe(0);

    const outside = run([20, 43, 28]);
    expect(outOfBandWarnings(outside)).toHaveLength(2);
    expect(outside.forecast?.outOfBandCount).toBe(2);
  });

  it("shifted band [24,39] flags 23 and 40, accepts 24 and 39", () => {
    const flagged = run([23, 40, 28], { min: 24, max: 39 });
    expect(outOfBandWarnings(flagged)).toHaveLength(2);
    expect(flagged.forecast?.outOfBandCount).toBe(2);

    const accepted = run([24, 39, 28], { min: 24, max: 39 });
    expect(outOfBandWarnings(accepted)).toHaveLength(0);
    expect(accepted.forecast?.outOfBandCount).toBe(0);
  });
});
