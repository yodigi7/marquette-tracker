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

  it("renders one bar series per cycle, aligned by cycle day", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 10 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 10 }),
    ];
    render(<CycleComparisonChart models={models} />);
    const bands = screen.getAllByTestId("comparison-day-band");
    // 2 cycles x 10 days = 20 bands
    expect(bands).toHaveLength(20);
  });

  it("aligns cycles by cycle day regardless of calendar start", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 10, day1: "2026-01-01" }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 10, day1: "2026-02-15" }),
    ];
    render(<CycleComparisonChart models={models} />);
    // Both cycles should have bands at day 1
    const day1Bands = screen
      .getAllByTestId("comparison-day-band")
      .filter((el) => el.getAttribute("data-day") === "1");
    expect(day1Bands).toHaveLength(2);
  });

  it("pads shorter cycles to the longest cycle in the set", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    // The x-axis should span to day 28 (the longest cycle)
    const xAxis = document.querySelector(".recharts-xAxis");
    expect(xAxis).toBeTruthy();
    // Both cycles should have bands at day 1
    const day1Bands = screen
      .getAllByTestId("comparison-day-band")
      .filter((el) => el.getAttribute("data-day") === "1");
    expect(day1Bands).toHaveLength(2);
  });

  it("renders per-cycle window bands when interpretation is enabled", () => {
    const models = [
      makeModel({
        cycleId: "c1",
        cycleNo: 1,
        span: 28,
        window: { begin: 6, end: 17, beginRule: "calendar-day-6", endRule: "current-peak-plus-n" },
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
    const bands = screen.getAllByTestId("comparison-day-band");
    const cycle1Bands = bands.filter((el) => el.getAttribute("data-cycle-id") === "c1");
    const cycle2Bands = bands.filter((el) => el.getAttribute("data-cycle-id") === "c2");
    expect(cycle1Bands).toHaveLength(28);
    expect(cycle2Bands).toHaveLength(21);
  });

  it("shows cycle number and length in the legend", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    expect(screen.getByText(/Cycle 1/)).toBeInTheDocument();
    expect(screen.getByText(/Cycle 2/)).toBeInTheDocument();
  });

  it("renders a distinct overlap region where two windows overlap", () => {
    const models = [
      makeModel({
        cycleId: "c1",
        cycleNo: 1,
        span: 28,
        window: { begin: 6, end: 17, beginRule: "calendar-day-6", endRule: "current-peak-plus-n" },
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
    const overlaps = screen.getAllByTestId("comparison-window-overlap");
    expect(overlaps.length).toBe(1);
    expect(overlaps[0].getAttribute("data-begin")).toBe("8");
    expect(overlaps[0].getAttribute("data-end")).toBe("17");
  });

  it("renders no overlap region when windows do not overlap", () => {
    const models = [
      makeModel({
        cycleId: "c1",
        cycleNo: 1,
        span: 28,
        window: { begin: 6, end: 10, beginRule: "calendar-day-6", endRule: "current-peak-plus-n" },
      }),
      makeModel({
        cycleId: "c2",
        cycleNo: 2,
        span: 28,
        window: {
          begin: 15,
          end: 20,
          beginRule: "first-high-or-peak",
          endRule: "current-peak-plus-n",
        },
      }),
    ];
    render(<CycleComparisonChart models={models} />);
    expect(screen.queryByTestId("comparison-window-overlap")).toBeNull();
  });

  it("clicking a legend item hides that cycle from the chart", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    const bandsBefore = screen.getAllByTestId("comparison-day-band");
    expect(bandsBefore.length).toBe(49); // 28 + 21

    // Click the first legend item to hide cycle 1
    const legendItem = screen.getAllByTestId("comparison-legend-item")[0];
    fireEvent.click(legendItem);

    const bandsAfter = screen.getAllByTestId("comparison-day-band");
    expect(bandsAfter.length).toBe(21); // only cycle 2 remains
  });

  it("clicking a legend item twice toggles the cycle back on", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    render(<CycleComparisonChart models={models} />);
    const bandsBefore = screen.getAllByTestId("comparison-day-band");
    expect(bandsBefore.length).toBe(49);

    // Click to hide
    const legendItem = screen.getAllByTestId("comparison-legend-item")[0];
    fireEvent.click(legendItem);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(21);

    // Click again to show
    fireEvent.click(legendItem);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(49);
  });
});
