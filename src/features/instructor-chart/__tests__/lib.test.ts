import { describe, expect, it } from "vitest";
import { computeAll } from "@/core/engine/engineSdk";
import type { DayRecordEntity } from "@/core/store/entities";
import { ABSENT, NO_READING_LOGGED, buildInstructorChartModel } from "../lib";

/**
 * The chart model: cycle days across, observations down, evidence beside every calendar-rule claim.
 *
 * Pure and DOM-free by construction — these cases are about which rows exist, what a missing day says,
 * and what evidence a claim carries, none of which need a browser.
 */

/** One cycle per month so every cycle closes and cycle-day numbering is independent of the calendar. */
function cyclesOf(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i + 1}`,
    day1: `2026-${String(i + 1).padStart(2, "0")}-01`,
  }));
}

type RecordOverrides = Partial<Omit<DayRecordEntity, "id" | "cycleId" | "date" | "dayInCycle">>;

/** The real date of cycle day `day` of a cycle whose Day 1 is the 1st of `month`, in 2026. */
function dayDate(month: number, day: number): string {
  const date = new Date(Date.UTC(2026, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function rec(
  cycleId: string,
  dayInCycle: number,
  month: number,
  overrides: RecordOverrides = {},
): DayRecordEntity {
  return {
    id: `${cycleId}-d${dayInCycle}`,
    cycleId,
    date: dayDate(month, dayInCycle),
    dayInCycle,
    // Sync metadata the chart never reads, present so the fixture is a real DayRecordEntity.
    version: 1,
    synced: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function peak(cycleId: string, dayInCycle: number, month: number): DayRecordEntity {
  return rec(cycleId, dayInCycle, month, { monitor: "peak" });
}

function compute(count: number, records: DayRecordEntity[], historyWindow = 6) {
  return computeAll(
    cyclesOf(count),
    records,
    { historyWindow, cycleMinLength: 21, cycleMaxLength: 42 },
    "2026-12-01",
  );
}

function model(
  count: number,
  records: DayRecordEntity[],
  options: { cycles?: number; algorithmEnabled?: boolean; historyWindow?: number } = {},
) {
  const output = compute(count, records, options.historyWindow);
  return buildInstructorChartModel({
    results: output.cycles,
    records,
    algorithmEnabled: options.algorithmEnabled ?? true,
    cycleCount: options.cycles ?? 6,
  });
}

function rowIds(cycle: { rows: { id: string }[] }): string[] {
  return cycle.rows.map((row) => row.id);
}

describe("buildInstructorChartModel — run of cycles", () => {
  it("covers the most recent cycles, not the oldest", () => {
    const m = model(8, [], { cycles: 3 });
    expect(m.cycles.map((c) => c.cycleNo)).toEqual([6, 7, 8]);
  });

  it("covers every cycle when the count exceeds what exists", () => {
    const m = model(4, [], { cycles: 12 });
    expect(m.cycles).toHaveLength(4);
    expect(m.requestedCycles).toBe(12);
    expect(m.chartedCycles).toBe(4);
    // The chart says how many it managed to chart, so the gap is visible rather than implied.
    expect(m.notice).toMatch(/4 of 12/i);
    expect(m.notice).toMatch(/only 4/i);
  });

  it("names no shortfall when the full run is available", () => {
    const m = model(6, [], { cycles: 6 });
    expect(m.cycles).toHaveLength(6);
    expect(m.notice).toBeNull();
  });

  it("defaults to the configured history window", () => {
    const m = buildInstructorChartModel({
      results: compute(9, []).cycles,
      records: [],
      algorithmEnabled: true,
      cycleCount: 6,
    });
    expect(m.cycles).toHaveLength(6);
  });

  it("never includes a projected cycle", () => {
    // The engine returns only recorded cycles, so a projection cannot reach the model.
    const m = model(3, [], { cycles: 6 });
    expect(m.cycles.map((c) => c.cycleNo)).toEqual([1, 2, 3]);
  });
});

describe("buildInstructorChartModel — columns", () => {
  it("makes one column per cycle day, in order", () => {
    // Cycle 1 runs Jan 1 to Feb 1 inclusive, which is 31 days.
    const m = model(2, [], { cycles: 6 });
    const columns = m.cycles[0].columns.map((c) => c.day);
    expect(columns).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it("bounds an open cycle at today rather than at the next Day 1", () => {
    const output = computeAll(
      cyclesOf(1),
      [],
      { historyWindow: 6, cycleMinLength: 21, cycleMaxLength: 42 },
      "2026-01-10",
    );
    const m = buildInstructorChartModel({
      results: output.cycles,
      records: [],
      algorithmEnabled: true,
      cycleCount: 6,
    });
    // Day 1 is Jan 1 and today is Jan 10, so the open cycle reaches day 10 and no further.
    expect(m.cycles[0].columns.at(-1)?.day).toBe(10);
    expect(m.cycles[0].isOpen).toBe(true);
    expect(m.cycles[0].columns).toHaveLength(10);
  });

  it("caps an absurdly long open cycle instead of printing every day since Day 1", () => {
    // The engine bounds an open cycle at today, so a cycle opened in January against a December "today"
    // yields 335 day results. A chart column is a day a person can read, so the grid is capped, and
    // every row stays the same width as the columns.
    const output = computeAll(
      cyclesOf(1),
      [],
      { historyWindow: 6, cycleMinLength: 21, cycleMaxLength: 42 },
      "2026-12-01",
    );
    expect(output.cycles[0].days.length).toBeGreaterThan(300);
    const m = buildInstructorChartModel({
      results: output.cycles,
      records: [],
      algorithmEnabled: true,
      cycleCount: 6,
    });

    expect(m.cycles[0].columns).toHaveLength(60);
    expect(m.cycles[0].rows.every((row) => row.cells.length === 60)).toBe(true);
  });
});

describe("buildInstructorChartModel — rows", () => {
  it("always carries date, menses, monitor and window rows in that order", () => {
    const m = model(2, [rec("c1", 1, 1, { monitor: "low" })], { cycles: 6 });
    expect(rowIds(m.cycles[0])).toEqual(["date", "menses", "monitor", "window"]);
  });

  it("carries no optional row when nothing is logged", () => {
    const m = model(2, [rec("c1", 1, 1, { monitor: "low" })], { cycles: 6 });
    expect(rowIds(m.cycles[0])).not.toContain("bbt");
    expect(rowIds(m.cycles[0])).not.toContain("mucus");
  });

  it("adds rows when widening the run brings in a cycle that holds the value", () => {
    // Only the older cycle has a temperature. Charting one cycle shows no temperature row at all;
    // widening to two brings the temperature onto the page.
    const records = [rec("c1", 3, 1, { bbt: 36.5 })];

    const narrow = model(2, records, { cycles: 1 });
    expect(narrow.cycles).toHaveLength(1);
    expect(rowIds(narrow.cycles[0])).not.toContain("bbt");

    const wide = model(2, records, { cycles: 2 });
    expect(wide.cycles).toHaveLength(2);
    expect(rowIds(wide.cycles[0])).toContain("bbt");
    expect(rowIds(wide.cycles[1])).not.toContain("bbt");
  });

  it("adds a row only for the cycle that holds the value", () => {
    // Deliberate narrowing: the run has temperatures, cycle 1 has none, and a temperature row on cycle 1
    // would read to an instructor as missing data rather than as absence.
    const m = model(2, [rec("c2", 3, 2, { bbt: 36.5 })], { cycles: 6 });
    expect(rowIds(m.cycles[0])).not.toContain("bbt");
    expect(rowIds(m.cycles[1])).toContain("bbt");
  });

  it("adds rows for every observation the cycle holds", () => {
    const m = model(
      1,
      [
        rec("c1", 1, 1, { monitor: "low" }),
        rec("c1", 5, 1, { mucus: "low", bbt: 36.4, intercourse: true }),
        rec("c1", 9, 1, { pregnancyTest: "negative" }),
        rec("c1", 10, 1, { symptoms: ["headache"], notes: "slept badly" }),
      ],
      { cycles: 6 },
    );
    expect(rowIds(m.cycles[0])).toEqual([
      "date",
      "menses",
      "monitor",
      "window",
      "mucus",
      "bbt",
      "intercourse",
      "pregnancy",
      "symptoms",
      "notes",
    ]);
  });

  it("shows an absence, never a value, for a day that records nothing for that row", () => {
    // Day 3 has a record (it carries a monitor reading) but no temperature, so the temperature cell is
    // an absence. And day 1's temperature is not repeated forward onto it.
    const m = model(
      1,
      [rec("c1", 1, 1, { monitor: "low", bbt: 36.4 }), rec("c1", 3, 1, { monitor: "low" })],
      { cycles: 6 },
    );
    const bbt = m.cycles[0].rows.find((r) => r.id === "bbt")!;

    expect(bbt.cells).toHaveLength(m.cycles[0].columns.length);
    expect(bbt.cells[0].text).toBe("36.4");
    expect(bbt.cells[2].text).toBe(ABSENT);
    expect(bbt.cells[2].empty).toBe(true);
  });

  it("shows a gap, not a repeated value, for a day with no record at all", () => {
    const m = model(1, [rec("c1", 1, 1, { monitor: "low", bbt: 36.4 })], { cycles: 6 });
    const bbt = m.cycles[0].rows.find((r) => r.id === "bbt")!;

    // Day 2 has no record. It is a gap in the grid, and day 1's reading is not carried onto it.
    expect(bbt.cells[1].empty).toBe(true);
    expect(bbt.cells[1].text).not.toContain("36.4");
  });

  it("names a day with no record as having no monitor reading logged", () => {
    const m = model(1, [rec("c1", 1, 1, { monitor: "low" })], { cycles: 6 });
    const monitor = m.cycles[0].rows.find((r) => r.id === "monitor")!;
    expect(monitor.cells[0].text).toBe("Low");
    // The monitor row states an unlogged day in words, so "no reading" is not mistaken for a gap.
    expect(monitor.cells[1].text).toBe(NO_READING_LOGGED);
  });
});

describe("buildInstructorChartModel — the fertile window band", () => {
  it("marks exactly the days the engine calls fertile", () => {
    const records = [rec("c1", 1, 1, { monitor: "low" })];
    for (let day = 6; day <= 12; day++) records.push(rec("c1", day, 1, { monitor: "high" }));
    records.push(peak("c1", 13, 1));
    const m = model(1, records, { cycles: 6 });
    const window = m.cycles[0].rows.find((r) => r.id === "window")!;

    const marked = window.cells.map((c, i) => (c.marked ? i + 1 : 0)).filter(Boolean);
    // Day 6 opens the window; the Peak on 13 ends it three days later, so the band is 6..16.
    expect(marked).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it("bands from the begin to the end of the cycle when no end can be determined", () => {
    const records = [rec("c1", 1, 1, { monitor: "low" })];
    for (let day = 6; day <= 12; day++) records.push(rec("c1", day, 1, { monitor: "low" }));
    const m = model(1, records, { cycles: 6 });
    const window = m.cycles[0].rows.find((r) => r.id === "window")!;

    // Day 6 opens the window and there is no end, so every day from 6 onward is fertile.
    expect(window.cells[5].marked).toBe(true);
    expect(window.cells.at(-1)!.marked).toBe(true);
    expect(window.cells.slice(0, 5).every((c) => !c.marked)).toBe(true);
    expect(m.cycles[0].endDay).toBeNull();
    expect(m.cycles[0].endNote).toMatch(/no end determined/i);
  });

  it("says the window opened by a recorded reading when one did", () => {
    const records = [rec("c1", 1, 1, { monitor: "low" })];
    for (let day = 4; day <= 6; day++) records.push(rec("c1", day, 1, { monitor: "high" }));
    const m = model(1, records, { cycles: 6 });
    expect(m.cycles[0].beginNote).toMatch(/recorded reading/i);
    expect(m.cycles[0].beginNote).toMatch(/day 4/i);
    expect(m.cycles[0].evidence).toEqual([]);
  });

  it("omits the window row and all evidence with interpretation off", () => {
    const m = model(7, [peak("c3", 12, 3), peak("c4", 15, 4)], {
      cycles: 6,
      algorithmEnabled: false,
    });
    for (const cycle of m.cycles) {
      expect(rowIds(cycle)).not.toContain("window");
      expect(cycle.evidence).toEqual([]);
      expect(cycle.beginNote).toBeNull();
    }
    // The recorded readings are still shown; only the derived half is withheld.
    expect(rowIds(m.cycles[0])).toEqual(["date", "menses", "monitor"]);
  });
});

describe("buildInstructorChartModel — evidence beside a calendar-rule claim", () => {
  it("names the earliest Peak and its cycle when the rule ran", () => {
    const m = model(7, [peak("c2", 15, 2), peak("c3", 12, 3), peak("c5", 18, 5)], { cycles: 6 });
    const seven = m.cycles.find((c) => c.cycleNo === 7)!;

    expect(seven.beginRule).toBe("calendar-earliest-peak-minus-6");
    // Earliest Peak day in the window is 12 on cycle 3, so the begin lands on day 6.
    expect(seven.beginDay).toBe(6);
    expect(seven.evidence.map((e) => e.cycleNo)).toEqual([2, 3, 5]);
    expect(seven.evidence.map((e) => e.peakDay)).toEqual([15, 12, 18]);
    expect(seven.beginNote).toMatch(/calendar rule/i);
    expect(seven.beginNote).toMatch(/earliest Peak day 12, cycle 3/i);
  });

  it("prints every contributing Peak and marks which are charted", () => {
    // Six cycles charted, so the whole window is on the page.
    const m = model(8, [peak("c2", 15, 2), peak("c3", 12, 3), peak("c6", 19, 6)], { cycles: 6 });
    const eight = m.cycles.find((c) => c.cycleNo === 8)!;

    expect(eight.evidence.map((e) => e.cycleNo)).toEqual([2, 3, 6]);
    // Six cycles are charted, so cycles 3, 4 and 5 are on the page. Cycle 2 is not, and says so.
    expect(eight.evidence.map((e) => e.charted)).toEqual([false, true, true]);
    expect(eight.evidence[0].phrase).toMatch(/cycle 2 day 15 \(not on this chart\)/);
    expect(eight.evidence[1].phrase).toMatch(/cycle 3 day 12 \(charted on this page\)/);
  });

  it("marks evidence from cycles the chart does not cover", () => {
    // Only the last two cycles are charted, so the window reaches back past what is on the page.
    const m = model(8, [peak("c2", 15, 2), peak("c3", 12, 3), peak("c6", 19, 6)], { cycles: 2 });
    const eight = m.cycles.find((c) => c.cycleNo === 8)!;
    const charted = new Set(m.cycles.map((c) => c.cycleNo));

    expect([...charted].sort((a, b) => a - b)).toEqual([7, 8]);
    // The claim stays checkable: every contributing Peak is named, and each says whether the cycle it
    // came from is actually on the page.
    expect(eight.evidence.map((e) => e.peakDay)).toEqual([15, 12, 19]);
    expect(eight.evidence.every((e) => e.charted === false)).toBe(true);
    // The headline names the one number the rule turned on; the list carries the rest.
    expect(eight.beginNote).toMatch(/earliest Peak day 12, cycle 3/i);
    expect(eight.evidence.map((e) => e.phrase)).toEqual([
      "cycle 2 day 15 (not on this chart)",
      "cycle 3 day 12 (not on this chart)",
      "cycle 6 day 19 (not on this chart)",
    ]);
  });

  it("says the rule had no Peak to use and prints no Peak day", () => {
    const records = [rec("c2", 8, 2, { monitor: "low" }), rec("c3", 9, 3, { monitor: "low" })];
    const m = model(7, records, { cycles: 6 });
    const seven = m.cycles.find((c) => c.cycleNo === 7)!;

    expect(seven.beginRule).toBe("calendar-day-6-fallback");
    expect(seven.evidence).toEqual([]);
    expect(seven.evidenceNote).toMatch(/no monitor peak/i);
    // A fallback reaches day 6 by rule, not by measurement, so no Peak day is claimed.
    expect(seven.evidenceNote).not.toMatch(/day \d/);
  });

  it("carries no evidence for a cycle inside the first six", () => {
    const m = model(3, [peak("c2", 12, 2)], { cycles: 6 });
    expect(m.cycles[1].beginRule).toBe("calendar-day-6");
    expect(m.cycles[1].evidence).toEqual([]);
    expect(m.cycles[1].beginNote).toMatch(/day 6/);
  });
});

describe("buildInstructorChartModel — identity and warnings", () => {
  it("states a closed cycle's length and an open cycle's progress", () => {
    const output = computeAll(
      cyclesOf(2),
      [],
      { historyWindow: 6, cycleMinLength: 21, cycleMaxLength: 42 },
      "2026-02-15",
    );
    const m = buildInstructorChartModel({
      results: output.cycles,
      records: [],
      algorithmEnabled: true,
      cycleCount: 6,
    });

    const first = m.cycles[0];
    expect(first.isOpen).toBe(false);
    // Jan 1 to Feb 1 inclusive is 31 days.
    expect(first.lengthLabel).toMatch(/31 days/);
    expect(first.lengthLabel).not.toMatch(/progress/i);

    const second = m.cycles[1];
    expect(second.isOpen).toBe(true);
    expect(second.lengthLabel).toMatch(/progress/i);
    expect(second.lengthLabel).not.toMatch(/\d+ days/);
  });

  it("reports a cycle's Peak day and count", () => {
    const m = model(1, [peak("c1", 12, 1), peak("c1", 15, 1)], { cycles: 6 });
    expect(m.cycles[0].peakLine).toMatch(/day 15/);
    expect(m.cycles[0].peakLine).toMatch(/2/);
  });

  it("carries the protocol warnings the engine raised for a charted cycle", () => {
    // A cycle with no Peak raises no-peak-end, and it is the engine's warning, not one invented here.
    const output = compute(2, [rec("c1", 8, 1, { monitor: "high" })]);
    const m = buildInstructorChartModel({
      results: output.cycles,
      records: [rec("c1", 8, 1, { monitor: "high" })],
      algorithmEnabled: true,
      cycleCount: 6,
    });
    expect(m.cycles[0].warningLines.join(" ")).toMatch(/no monitor peak/i);
  });

  it("shows no warnings section for a cycle the engine did not warn about", () => {
    // A closed cycle with a Peak and a 31-day length: an end exists, the length is in band, and the
    // cycle is not open, so the engine raises nothing for it.
    const m = model(2, [peak("c1", 12, 1)], { cycles: 6 });
    expect(m.cycles[0].warningLines).toEqual([]);
  });
});
