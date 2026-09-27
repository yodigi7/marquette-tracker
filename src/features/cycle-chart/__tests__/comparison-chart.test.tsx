import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { StripModel } from "../lib";
import { CycleComparisonChart } from "../comparison-chart";
import { installChartShim } from "./helpers";

installChartShim();

function makeDay(
  day: number,
  monitor?: StripModel["days"][number]["monitor"],
): StripModel["days"][number] {
  return {
    day,
    date: "2026-01-01",
    monitor,
    mucus: undefined,
    bbt: null,
    intercourse: false,
    status: "pre-fertile",
  };
}

function makeModel(over: Partial<StripModel> & { cycleId: string; cycleNo: number }): StripModel {
  const span = over.span ?? 10;
  const days = Array.from({ length: span }, (_, i) => makeDay(i + 1));
  return {
    day1: "2026-01-01",
    open: false,
    span,
    days,
    window: null,
    ...over,
  };
}

describe("CycleComparisonChart", () => {
  afterEach(() => cleanup());

  it("renders one row per cycle, aligned by cycle day", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 10 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 10 }),
    ];
    render(<CycleComparisonChart models={models} />);
    const rows = screen.getAllByTestId("comparison-legend-item");
    expect(rows).toHaveLength(2);
    const bands = screen.getAllByTestId("comparison-day-band");
    expect(bands.length).toBe(20);
  });

  it("aligns cycles by cycle day regardless of calendar start", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 10, day1: "2026-01-01" }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 10, day1: "2026-02-15" }),
    ];
    render(<CycleComparisonChart models={models} />);
    const bands = screen.getAllByTestId("comparison-day-band");
    expect(bands.length).toBe(20);

    // Same cycle day must land at the same x in every row, whatever the calendar date.
    const xByCycleAndDay = new Map<string, string>();
    for (const band of bands) {
      const key = `${band.getAttribute("data-day")}`;
      const x = band.getAttribute("x");
      const existing = xByCycleAndDay.get(key);
      if (existing === undefined) {
        xByCycleAndDay.set(key, x ?? "");
      } else {
        expect(x).toBe(existing);
      }
    }
    expect(xByCycleAndDay.size).toBe(10);
  });

  it("pads shorter cycles to the longest cycle in the set", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    const rows = screen.getAllByTestId("comparison-legend-item");
    expect(rows).toHaveLength(2);

    // The shorter cycle must not truncate the shared axis: the longer cycle still
    // reaches its final day.
    const bands = screen.getAllByTestId("comparison-day-band");
    const days = bands.map((b) => Number(b.getAttribute("data-day")));
    expect(Math.max(...days)).toBe(28);
    // Day 22..28 exist only for the longer cycle, so it is padded, not truncated.
    expect(bands.filter((b) => Number(b.getAttribute("data-day")) === 28)).toHaveLength(1);
  });

  it("renders per-cycle window bands when interpretation is enabled", () => {
    const models = [
      makeModel({
        cycleId: "c1",
        cycleNo: 1,
        span: 28,
        window: {
          begin: 6,
          end: 17,
          beginRule: "calendar-day-6",
          endRule: "current-peak-plus-n",
        },
      }),
      makeModel({
        cycleId: "c2",
        cycleNo: 2,
        span: 28,
        window: {
          begin: 8,
          end: 19,
          beginRule: "first-high-or-peak",
          endRule: "current-peak-plus-n",
        },
      }),
    ];
    render(<CycleComparisonChart models={models} />);
    const windowBands = screen.getAllByTestId("comparison-window-band");
    expect(windowBands).toHaveLength(2);
  });

  it("renders NO window bands when interpretation is disabled (window is null)", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28, window: null }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 28, window: null }),
    ];
    render(<CycleComparisonChart models={models} />);
    expect(screen.queryByTestId("comparison-window-band")).toBeNull();
  });

  it("handles a single cycle without error", () => {
    const models = [makeModel({ cycleId: "c1", cycleNo: 1, span: 28 })];
    render(<CycleComparisonChart models={models} />);
    const bands = screen.getAllByTestId("comparison-day-band");
    expect(bands).toHaveLength(28);
  });

  it("handles an empty model array without error", () => {
    render(<CycleComparisonChart models={[]} />);
    expect(screen.queryByTestId("comparison-day-band")).toBeNull();
  });

  it("identifies cycles via data attributes for hover/focus", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    const items = screen.getAllByTestId("comparison-legend-item");
    expect(items[0].getAttribute("data-cycle-id")).toBe("c1");
    expect(items[1].getAttribute("data-cycle-id")).toBe("c2");
  });

  it("clicking a legend item hides that cycle from the chart", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(49);
    const toggles = screen.getAllByTestId("comparison-legend-toggle");
    fireEvent.click(toggles[0]);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(21);
  });

  it("clicking a legend item twice toggles the cycle back on", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(49);
    const toggles = screen.getAllByTestId("comparison-legend-toggle");
    fireEvent.click(toggles[0]);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(21);
    fireEvent.click(toggles[0]);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(49);
  });
});
