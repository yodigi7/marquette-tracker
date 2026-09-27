import { describe, expect, it } from "vitest";
import type { CycleEntity, DayRecordEntity } from "@/core/store/entities";
import type { CycleResult, DayResult, DayStatus } from "@/core/engine/types";
import {
  bbtSeries,
  buildStripModel,
  intercourseSeries,
  mucusSeries,
  resolveSelectedCycle,
  type StripDay,
} from "../lib";

function cycle(over: Partial<CycleEntity> = {}): CycleEntity {
  return {
    id: "c1",
    day1: "2026-01-01",
    cycleNo: 1,
    closedAt: "2026-01-29",
    notes: "",
    version: 1,
    synced: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function record(day: number, over: Partial<DayRecordEntity> = {}): DayRecordEntity {
  return {
    id: `r${day}`,
    cycleId: "c1",
    date: "2026-01-01",
    dayInCycle: day,
    version: 1,
    synced: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function dayResult(day: number, status: DayStatus): DayResult {
  return { day, date: "2026-01-01", status };
}

function result(over: Partial<CycleResult> = {}): CycleResult {
  return {
    cycleId: "c1",
    cycleNo: 1,
    day1: "2026-01-01",
    length: 28,
    peakDay: 14,
    peakSource: "monitor",
    fertileWindow: {
      begin: 6,
      end: 17,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
    },
    days: [dayResult(1, "pre-fertile"), dayResult(6, "fertile"), dayResult(14, "fertile")],
    warnings: [],
    ...over,
  };
}

describe("buildStripModel", () => {
  it("spans 1..length for a closed cycle with one StripDay per day", () => {
    const model = buildStripModel(cycle(), result(), [record(8, { monitor: "high" })], true);
    expect(model.days.length).toBe(28);
    expect(model.days[0].day).toBe(1);
    expect(model.days[27].day).toBe(28);
    expect(model.span).toBe(28);
    expect(model.open).toBe(false);
  });

  it("copies monitor, mucus, bbt, intercourse verbatim from day records", () => {
    const records = [
      record(8, { monitor: "high" }),
      record(14, { monitor: "peak", mucus: "peak" }),
      record(18, { intercourse: true }),
      record(10, { bbt: 36.5 }),
      record(12, { bbt: null }),
    ];
    const model = buildStripModel(cycle(), result(), records, true);
    expect(model.days[7].monitor).toBe("high");
    expect(model.days[13].monitor).toBe("peak");
    expect(model.days[13].mucus).toBe("peak");
    expect(model.days[17].intercourse).toBe(true);
    expect(model.days[9].bbt).toBe(36.5);
    expect(model.days[11].bbt).toBeNull();
    expect(model.days[0].intercourse).toBe(false);
  });

  it("leaves a day without a record unset (undefined monitor, null bbt, no intercourse)", () => {
    const model = buildStripModel(cycle(), result(), [record(14, { monitor: "peak" })], true);
    expect(model.days[20].monitor).toBeUndefined();
    expect(model.days[20].bbt).toBeNull();
    expect(model.days[20].intercourse).toBe(false);
  });

  it("carries a status for unrecorded days inside the window", () => {
    // The engine now emits a day result for every cycle day, so the chart
    // resolves statuses for days that hold no record.
    const dense = result({
      days: Array.from({ length: 28 }, (_, i) =>
        dayResult(i + 1, i + 1 < 6 ? "pre-fertile" : i + 1 <= 17 ? "fertile" : "post-peak"),
      ),
    });
    const model = buildStripModel(cycle(), dense, [record(14, { monitor: "peak" })], true);
    const byDay = new Map(model.days.map((d) => [d.day, d.status]));
    expect(byDay.get(13)).toBe("fertile");
    expect(byDay.get(16)).toBe("fertile");
    expect(byDay.get(18)).toBe("post-peak");
    // A day with no record still shows the empty monitor track.
    expect(model.days[12].monitor).toBeUndefined();
  });

  it("copies per-day status verbatim and exposes no source field", () => {
    const model = buildStripModel(cycle(), result(), [], true);
    expect(model.days[0].status).toBe("pre-fertile");
    expect(model.days[5].status).toBe("fertile");
    expect(model.days[13].status).toBe("fertile");
    expect(model.days[0]).not.toHaveProperty("source");
    expect(model.window).not.toHaveProperty("source");
  });

  it("uses max(1, maxDayInCycle) as the span for an open cycle", () => {
    const model = buildStripModel(
      cycle({ closedAt: null }),
      result({ length: null, days: [] }),
      [record(1, { bloodFlow: "medium" }), record(6, {})],
      true,
    );
    expect(model.span).toBe(6);
    expect(model.days.length).toBe(6);
    expect(model.open).toBe(true);
  });

  it("spans at least day 1 for an open cycle with no records", () => {
    const model = buildStripModel(
      cycle({ closedAt: null }),
      result({ length: null, days: [] }),
      [],
      true,
    );
    expect(model.span).toBe(1);
    expect(model.days.length).toBe(1);
    expect(model.days[0].day).toBe(1);
  });

  it("ignores stray records beyond a closed cycle length", () => {
    const model = buildStripModel(cycle(), result(), [record(30, { monitor: "peak" })], true);
    expect(model.span).toBe(28);
    expect(model.days.length).toBe(28);
  });

  it("exposes the window when algorithmEnabled and result are present", () => {
    const model = buildStripModel(cycle(), result(), [], true);
    expect(model.window).toEqual({
      begin: 6,
      end: 17,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
    });
  });

  it("uses one window treatment regardless of how the window began", () => {
    const calendar = buildStripModel(cycle(), result(), [], true);
    const earlyOpen = buildStripModel(
      cycle(),
      result({
        fertileWindow: {
          begin: 8,
          end: 17,
          beginRule: "first-high-or-peak",
          endRule: "current-peak-plus-n",
        },
      }),
      [],
      true,
    );
    expect(Object.keys(earlyOpen.window!).sort()).toEqual(Object.keys(calendar.window!).sort());
    expect(earlyOpen.window).not.toHaveProperty("source");
    expect(calendar.window).not.toHaveProperty("source");
  });

  it("returns window === null when algorithmEnabled is false (FR-004)", () => {
    const model = buildStripModel(cycle(), result(), [], false);
    expect(model.window).toBeNull();
  });

  it("returns window === null when result is undefined", () => {
    const model = buildStripModel(cycle(), undefined, [], true);
    expect(model.window).toBeNull();
  });

  it("keeps a null end when the engine reports no end", () => {
    const model = buildStripModel(
      cycle(),
      result({
        fertileWindow: { begin: 6, end: null, beginRule: "calendar-day-6", endRule: "none" },
      }),
      [],
      true,
    );
    expect(model.window?.end).toBeNull();
  });
});

describe("overlay series", () => {
  const days: StripDay[] = [
    {
      day: 1,
      date: "2026-01-01",
      monitor: undefined,
      mucus: undefined,
      bbt: null,
      intercourse: false,
      status: "pre-fertile",
    },
    {
      day: 2,
      date: "2026-01-02",
      monitor: undefined,
      mucus: "none",
      bbt: null,
      intercourse: false,
      status: "pre-fertile",
    },
    {
      day: 3,
      date: "2026-01-03",
      monitor: "low",
      mucus: "high",
      bbt: 36.4,
      intercourse: false,
      status: "fertile",
    },
    {
      day: 4,
      date: "2026-01-04",
      monitor: "peak",
      mucus: "peak",
      bbt: null,
      intercourse: true,
      status: "fertile",
    },
  ];

  it("bbtSeries drops null/undefined days and keeps the rest", () => {
    expect(bbtSeries(days)).toEqual([{ day: 3, bbt: 36.4 }]);
  });

  it("bbtSeries returns [] when empty", () => {
    expect(bbtSeries([])).toEqual([]);
  });

  it('mucusSeries keeps stored low/high/peak AND explicit "none"', () => {
    expect(mucusSeries(days)).toEqual([
      { day: 2, level: "none" },
      { day: 3, level: "high" },
      { day: 4, level: "peak" },
    ]);
  });

  it("intercourseSeries only includes days with intercourse === true", () => {
    expect(intercourseSeries(days)).toEqual([{ day: 4 }]);
    expect(intercourseSeries([])).toEqual([]);
  });
});

describe("resolveSelectedCycle", () => {
  const older = cycle({ id: "a", cycleNo: 1, day1: "2026-01-01" });
  const newer = cycle({ id: "b", cycleNo: 2, day1: "2026-01-29" });
  const cycles = [older, newer];

  it("returns the cycle matching the param", () => {
    expect(resolveSelectedCycle(cycles, "a")?.id).toBe("a");
  });

  it("falls back to the newest cycle for an unknown param", () => {
    expect(resolveSelectedCycle(cycles, "nope")?.id).toBe("b");
  });

  it("falls back to the newest cycle when the param is absent", () => {
    expect(resolveSelectedCycle(cycles, undefined)?.id).toBe("b");
  });

  it("returns undefined when there are no cycles", () => {
    expect(resolveSelectedCycle([], "a")).toBeUndefined();
    expect(resolveSelectedCycle([], undefined)).toBeUndefined();
  });
});
