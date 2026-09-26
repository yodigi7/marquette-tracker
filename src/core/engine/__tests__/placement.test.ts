import { describe, expect, it } from "vitest";
import { addDays } from "../dateUtils";
import { planCycles, type PlacedDay } from "../placement";

const BASE = "2026-01-01";

/**
 * Chart helper: 'M' = menses, 'N' = logged no-menses, '0' = no data (skipped).
 * Offsets advance per character so gaps are preserved in the date keys.
 */
function chart(pattern: string): PlacedDay[] {
  const days: PlacedDay[] = [];
  let offset = 0;
  for (const ch of pattern) {
    if (ch !== "0") {
      days.push({ date: addDays(BASE, offset), menses: ch === "M" });
    }
    offset += 1;
  }
  return days;
}

function plan(pattern: string) {
  return planCycles(chart(pattern));
}

function day1At(offset: number): string {
  return addDays(BASE, offset);
}

function summary(cycles: ReturnType<typeof planCycles>) {
  return cycles.map((c) => ({ day1: c.day1, count: c.dates.length }));
}

describe("planCycles", () => {
  it("returns no cycles for an empty log", () => {
    expect(planCycles([])).toEqual([]);
  });

  it("starts a cycle at the first logged day (single menses day)", () => {
    expect(summary(plan("M"))).toEqual([{ day1: day1At(0), count: 1 }]);
  });

  it("keeps consecutive menses days with only no-data days between them in one cycle", () => {
    // Canonical case: M000M0NNNNNN -> one cycle, Day 1 = first M.
    expect(summary(plan("M000M0NNNNNN"))).toEqual([{ day1: day1At(0), count: 8 }]);
    expect(summary(plan("M0M"))).toEqual([{ day1: day1At(0), count: 2 }]);
  });

  it("splits a leading no-menses run from the menses run that follows it", () => {
    // Canonical case: NNNNNNMMMMNNNN -> cycle of Ns, cycle starting at first M.
    expect(summary(plan("NNNNNNMMMMNNNN"))).toEqual([
      { day1: day1At(0), count: 6 },
      { day1: day1At(6), count: 8 },
    ]);
  });

  it("lets trailing no-menses days continue the current cycle", () => {
    expect(summary(plan("MMNNN"))).toEqual([{ day1: day1At(0), count: 5 }]);
    expect(summary(plan("M0N0M"))).toEqual([
      { day1: day1At(0), count: 2 },
      { day1: day1At(4), count: 1 },
    ]);
  });

  it("starts a new cycle on menses following any logged no-menses day", () => {
    expect(summary(plan("MMMNMMM"))).toEqual([
      { day1: day1At(0), count: 4 },
      { day1: day1At(4), count: 3 },
    ]);
    expect(summary(plan("NNNMM"))).toEqual([
      { day1: day1At(0), count: 3 },
      { day1: day1At(3), count: 2 },
    ]);
  });

  it("assigns every logged date to exactly one cycle in order", () => {
    const days = chart("NNNNNNMMMMNNNN");
    const cycles = planCycles(days);
    const assigned = cycles.flatMap((c) => c.dates);
    expect(assigned).toEqual(days.map((d) => d.date));
    for (const cycle of cycles) {
      expect(cycle.dates[0]).toBe(cycle.day1);
    }
  });

  it("groups the same way regardless of input order", () => {
    const forward = chart("NNNNNNMMMMNNNN");
    const shuffled = [...forward.slice(8), ...forward.slice(0, 8)].reverse();
    expect(planCycles(shuffled)).toEqual(planCycles(forward));
    expect(planCycles([...forward].reverse())).toEqual(planCycles(forward));
  });
});

describe("planCycles with declared cycle starts (anchors)", () => {
  function anchored(anchors: number[], pattern: string) {
    return planCycles(
      chart(pattern),
      anchors.map((o) => day1At(o)),
    );
  }

  it("opens a cycle at an anchor even when no record exists on that date", () => {
    const cycles = anchored([3], "M000M");
    expect(cycles.map((c) => c.day1)).toEqual([day1At(0), day1At(3)]);
    expect(cycles[1].dates).toEqual([day1At(4)]);
  });

  it("assigns records after an unrecorded anchor to the anchor cycle", () => {
    // Anchor on 1 Mar, records on 1 Mar (day 1) and 14 Mar (day 14).
    const cycles = anchored([0], "M00000000000000M");
    expect(cycles).toHaveLength(1);
    expect(cycles[0].day1).toBe(day1At(0));
    expect(cycles[0].dates).toHaveLength(2);
  });

  it("does not open a first-logged-day cycle before an existing boundary", () => {
    // Anchor at offset 0, first logged day at offset 5: it must join the anchor cycle.
    const cycles = anchored([0], "00000N000N");
    expect(cycles).toHaveLength(1);
    expect(cycles[0].day1).toBe(day1At(0));
    expect(cycles[0].dates).toEqual([day1At(5), day1At(9)]);
  });

  it("still applies the menses-run rule after an anchor", () => {
    const cycles = anchored([0], "M0M0N0M");
    expect(cycles.map((c) => c.day1)).toEqual([day1At(0), day1At(6)]);
    expect(cycles[0].dates).toEqual([day1At(0), day1At(2), day1At(4)]);
    expect(cycles[1].dates).toEqual([day1At(6)]);
  });

  it("ignores an anchor that has no records of its own and none after it", () => {
    // A declared start with nothing logged around it already owns a cycle row;
    // the partition only reports groupings derived from logged days.
    const cycles = planCycles(chart("M000M"), [day1At(8)]);
    expect(cycles).toEqual([{ day1: day1At(0), dates: [day1At(0), day1At(4)] }]);
  });

  it("is a no-op with no days and no anchors", () => {
    expect(planCycles([], [day1At(3)])).toEqual([]);
  });
});
