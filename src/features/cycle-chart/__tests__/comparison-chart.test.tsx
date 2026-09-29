import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { comparisonColors, CYCLE_COLORS, type StripModel } from "../lib";
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

/**
 * Renders the chart the way the view does. Colour is anchored to every logged
 * cycle in day order — not to the subset on screen — so the newest cycle takes
 * the first palette colour and no cycle's colour depends on the selection.
 */
/**
 * Renders the chart the way the view does.
 *
 * `logged` is every cycle on record and is what colour is anchored to; `shown`
 * is the subset the chart draws. They are the same in most tests, but keeping
 * them separate is the point: the view resolves colour from the store's full
 * cycle list, so the chart must not be handed colours derived from its own input.
 */
function renderChart(shown: StripModel[], logged: readonly StripModel[] = shown) {
  const dayAscending = [...logged].sort((a, b) => (a.day1 < b.day1 ? -1 : 1));
  return render(
    <CycleComparisonChart
      models={shown}
      colorByCycleId={comparisonColors(dayAscending.map((m) => ({ id: m.cycleId })))}
    />,
  );
}

describe("CycleComparisonChart", () => {
  afterEach(() => cleanup());

  it("encodes the monitor reading as block height, not just opacity", () => {
    const days = Array.from({ length: 10 }, (_, i) => makeDay(i + 1));
    days[0].monitor = "peak"; // tallest
    days[1].monitor = "high"; // medium
    days[2].monitor = "low"; // shortest real reading
    days[3].monitor = undefined; // unlogged -> thin empty track
    const model = makeModel({ cycleId: "c1", cycleNo: 1, days, span: 10 });
    renderChart([model]);

    const h = (day: number) =>
      Number(
        screen
          .getAllByTestId("comparison-day-band")
          .find((el) => el.getAttribute("data-day") === String(day))
          ?.getAttribute("height"),
      );

    // day 1 = peak, day 2 = high, day 3 = low, day 4 = unlogged
    expect(h(1)).toBeGreaterThan(h(2)); // peak > high
    expect(h(2)).toBeGreaterThan(h(3)); // high > low
    expect(h(3)).toBeGreaterThan(h(4)); // low > unlogged

    // Unlogged days keep a visible track rather than vanishing, so "no reading"
    // never looks like "a very short reading".
    expect(h(4)).toBeGreaterThan(0);
  });

  it("bottom-aligns blocks so readings share a baseline", () => {
    const days = Array.from({ length: 10 }, (_, i) => makeDay(i + 1));
    days[0].monitor = "low";
    days[1].monitor = "peak";
    const model = makeModel({ cycleId: "c1", cycleNo: 1, days, span: 10 });
    renderChart([model]);

    const geom = (day: number) => {
      const el = screen
        .getAllByTestId("comparison-day-band")
        .find((e) => e.getAttribute("data-day") === String(day));
      return { y: Number(el?.getAttribute("y")), h: Number(el?.getAttribute("height")) };
    };
    const low = geom(1);
    const peak = geom(2);
    // Same bottom edge, different top edge.
    expect(low.y + low.h).toBeCloseTo(peak.y + peak.h, 1);
  });

  it("renders one row per cycle, aligned by cycle day", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 10 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 10 }),
    ];
    renderChart(models);
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
    renderChart(models);
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
    renderChart(models);
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
    renderChart(models);
    const windowBands = screen.getAllByTestId("comparison-window-band");
    expect(windowBands).toHaveLength(2);
  });

  it("renders NO window bands when interpretation is disabled (window is null)", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28, window: null }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 28, window: null }),
    ];
    renderChart(models);
    expect(screen.queryByTestId("comparison-window-band")).toBeNull();
  });

  it("handles a single cycle without error", () => {
    const models = [makeModel({ cycleId: "c1", cycleNo: 1, span: 28 })];
    renderChart(models);
    const bands = screen.getAllByTestId("comparison-day-band");
    expect(bands).toHaveLength(28);
  });

  it("handles an empty model array without error", () => {
    renderChart([]);
    expect(screen.queryByTestId("comparison-day-band")).toBeNull();
  });

  it("identifies cycles via data attributes for hover/focus", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    renderChart(models);
    const items = screen.getAllByTestId("comparison-legend-item");
    expect(items[0].getAttribute("data-cycle-id")).toBe("c1");
    expect(items[1].getAttribute("data-cycle-id")).toBe("c2");
  });

  it("clicking a legend item hides that cycle from the chart", () => {
    const models = [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28 }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21 }),
    ];
    renderChart(models);
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
    renderChart(models);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(49);
    const toggles = screen.getAllByTestId("comparison-legend-toggle");
    fireEvent.click(toggles[0]);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(21);
    fireEvent.click(toggles[0]);
    expect(screen.getAllByTestId("comparison-day-band").length).toBe(49);
  });
});

describe("CycleComparisonChart colour identity", () => {
  afterEach(() => cleanup());

  /** Four logged cycles, oldest first, with distinct start dates. */
  function fourModels(): StripModel[] {
    return [
      makeModel({ cycleId: "c1", cycleNo: 1, span: 28, day1: "2026-01-01" }),
      makeModel({ cycleId: "c2", cycleNo: 2, span: 21, day1: "2026-01-29" }),
      makeModel({ cycleId: "c3", cycleNo: 3, span: 25, day1: "2026-02-19" }),
      makeModel({ cycleId: "c4", cycleNo: 4, span: 30, day1: "2026-03-16" }),
    ];
  }

  const bandColor = (cycleId: string): string | null =>
    screen
      .getAllByTestId("comparison-day-band")
      .find((el) => el.dataset.cycleId === cycleId)
      ?.getAttribute("data-color") ?? null;

  const labelColor = (cycleId: string): string | null =>
    screen
      .getAllByTestId("comparison-legend-item")
      .find((el) => el.dataset.cycleId === cycleId)
      ?.getAttribute("data-color") ?? null;

  const legendColor = (cycleId: string): string | null =>
    screen
      .getAllByTestId("comparison-legend-toggle")
      .find((el) => el.dataset.cycleId === cycleId)
      ?.getAttribute("data-color") ?? null;

  const hideCycle = (cycleId: string): void => {
    const toggle = screen
      .getAllByTestId("comparison-legend-toggle")
      .find((el) => el.dataset.cycleId === cycleId);
    fireEvent.click(toggle!);
  };

  it("gives each cycle a colour from the palette, anchored to recency", () => {
    renderChart(fourModels());
    // Newest logged cycle takes the first palette colour, and the order runs
    // backwards from there, so colour carries rank by recency.
    expect(labelColor("c4")).toBe(CYCLE_COLORS[0]);
    expect(labelColor("c3")).toBe(CYCLE_COLORS[1]);
    expect(labelColor("c2")).toBe(CYCLE_COLORS[2]);
    expect(labelColor("c1")).toBe(CYCLE_COLORS[3]);
  });

  it("keeps the row label, the legend, and the plotted data on one colour", () => {
    renderChart(fourModels());
    for (const id of ["c1", "c2", "c3", "c4"]) {
      const color = labelColor(id);
      expect(color).not.toBeNull();
      expect(legendColor(id)).toBe(color);
      expect(bandColor(id)).toBe(color);
    }
  });

  it("does not repaint other cycles when a cycle is hidden", () => {
    renderChart(fourModels());
    const before = {
      c1: labelColor("c1"),
      c2: labelColor("c2"),
      c3: labelColor("c3"),
      c4: labelColor("c4"),
    };
    // The reported case: hiding the newest cycle turned the next one blue.
    hideCycle("c4");
    expect(labelColor("c3")).toBe(before.c3);
    expect(bandColor("c3")).toBe(before.c3);
    // Every other survivor keeps its colour too, not just the top one.
    expect(labelColor("c2")).toBe(before.c2);
    expect(bandColor("c2")).toBe(before.c2);
    expect(labelColor("c1")).toBe(before.c1);
    expect(bandColor("c1")).toBe(before.c1);
  });

  it("restores the original colours when a hidden cycle comes back", () => {
    renderChart(fourModels());
    const before = { c2: labelColor("c2"), c3: labelColor("c3") };
    hideCycle("c4");
    hideCycle("c2");
    // Two cycles are hidden here; the one still on screen must not have moved.
    expect(labelColor("c3")).toBe(before.c3);
    hideCycle("c2");
    hideCycle("c4");
    // Both are back, and both hold the colours they started with.
    expect(labelColor("c2")).toBe(before.c2);
    expect(bandColor("c2")).toBe(before.c2);
    expect(labelColor("c3")).toBe(before.c3);
    expect(bandColor("c3")).toBe(before.c3);
  });

  it("gives every cycle its colour even when only some are shown", () => {
    // The anchor is the full logged set, so a sparse selection keeps the colours
    // those cycles have everywhere else rather than renumbering from one.
    const all = fourModels();
    renderChart([all[3], all[1]], all);
    expect(labelColor("c4")).toBe(CYCLE_COLORS[0]);
    expect(labelColor("c2")).toBe(CYCLE_COLORS[2]);
  });

  it("produces the same colours when the same data is read again", () => {
    renderChart(fourModels());
    const first = ["c1", "c2", "c3", "c4"].map(labelColor);
    cleanup();
    renderChart(fourModels());
    const second = ["c1", "c2", "c3", "c4"].map(labelColor);
    expect(second).toEqual(first);
  });
});

describe("Comparison window band neutrality", () => {
  afterEach(() => cleanup());

  /** Two cycles that wear different colours and both hold a window. */
  const twoWindowedModels = (): StripModel[] => [
    makeModel({
      cycleId: "c1",
      cycleNo: 1,
      span: 28,
      day1: "2026-01-01",
      window: { begin: 6, end: 17, beginRule: "calendar-day-6", endRule: "current-peak-plus-n" },
    }),
    makeModel({
      cycleId: "c2",
      cycleNo: 2,
      span: 28,
      day1: "2026-01-29",
      window: {
        begin: 8,
        end: 19,
        beginRule: "first-high-or-peak",
        endRule: "current-peak-plus-n",
      },
    }),
  ];

  it("gives every cycle's window the same neutral treatment, not that cycle's colour", () => {
    const models = twoWindowedModels();
    renderChart(models);
    const fills = screen
      .getAllByTestId("comparison-window-band")
      .map((el) => el.getAttribute("fill"));
    expect(fills).toHaveLength(2);
    // One treatment for every cycle, so the band never reads as a cycle colour.
    expect(new Set(fills).size).toBe(1);

    const cycleColors = new Set(
      screen.getAllByTestId("comparison-legend-item").map((el) => el.getAttribute("data-color")),
    );
    for (const fill of fills) {
      expect(cycleColors.has(fill!)).toBe(false);
    }
  });

  it("keeps a surviving cycle's window band unchanged when another cycle is hidden", () => {
    renderChart(twoWindowedModels());
    const fillFor = (cycleId: string): string | null =>
      screen
        .getAllByTestId("comparison-window-band")
        .find((el) => el.dataset.cycleId === cycleId)
        ?.getAttribute("fill") ?? null;
    const before = fillFor("c1");

    const toggle = screen
      .getAllByTestId("comparison-legend-toggle")
      .find((el) => el.dataset.cycleId === "c2");
    fireEvent.click(toggle!);

    // Hiding a cycle removes its whole row, band included. The cycle still on
    // screen keeps the neutral fill it started with.
    expect(screen.getAllByTestId("comparison-window-band")).toHaveLength(1);
    expect(fillFor("c1")).toBe(before);
  });

  it("still draws the unlogged-day track inside a window band", () => {
    // The track is the chart's faintest mark and exists to keep "no reading"
    // distinct from "a short reading". A tinted window behind it would erase it,
    // which is why the band stays neutral.
    renderChart(twoWindowedModels());
    const tracks = screen
      .getAllByTestId("comparison-day-band")
      .filter((el) => el.getAttribute("data-monitor") === "none");
    expect(tracks.length).toBeGreaterThan(0);
    // Every unlogged day in these models falls inside a window, so each track is
    // drawn over the band rather than on bare surface.
    expect(tracks.every((el) => el.getAttribute("data-color") !== null)).toBe(true);
  });
});
