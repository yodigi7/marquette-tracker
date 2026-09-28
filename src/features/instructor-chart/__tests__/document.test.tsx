import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InstructorChartDocument } from "../document";
import type { InstructorChartModel } from "../lib";

afterEach(cleanup);

/**
 * The printed grid: cycle days across, observations down.
 *
 * Presentational only, so these cases are about the markup that reaches paper — that days are columns,
 * that the band is a mark rather than a colour, and that nothing interactive is inside the sheet.
 */

function model(overrides: Partial<InstructorChartModel> = {}): InstructorChartModel {
  return {
    cycles: [
      {
        cycleId: "c7",
        cycleNo: 7,
        day1: "2026-07-01",
        isOpen: false,
        lengthLabel: "28 days",
        peakLine: "Peak day 12",
        columns: [
          { day: 1, date: "2026-07-01" },
          { day: 2, date: "2026-07-02" },
          { day: 3, date: "2026-07-03" },
        ],
        rows: [
          {
            id: "date",
            label: "Date",
            cells: [
              { text: "2026-07-01", empty: false, marked: false },
              { text: "2026-07-02", empty: false, marked: false },
              { text: "2026-07-03", empty: false, marked: false },
            ],
          },
          {
            id: "menses",
            label: "Menses",
            cells: [
              { text: "Medium", empty: false, marked: false },
              { text: "—", empty: true, marked: false },
              { text: "—", empty: true, marked: false },
            ],
          },
          {
            id: "monitor",
            label: "Monitor",
            cells: [
              { text: "Low", empty: false, marked: false },
              { text: "Low", empty: false, marked: false },
              { text: "High", empty: false, marked: false },
            ],
          },
          {
            id: "window",
            label: "Fertile window",
            cells: [
              { text: "", empty: true, marked: false },
              { text: "", empty: true, marked: true },
              { text: "", empty: true, marked: true },
            ],
          },
        ],
        beginDay: 2,
        endDay: 4,
        beginRule: "calendar-earliest-peak-minus-6",
        beginNote: "Opened by the calendar rule — earliest Peak day 8, cycle 3.",
        endNote: null,
        evidence: [
          { cycleNo: 3, peakDay: 8, charted: false, phrase: "cycle 3 day 8 (not on this chart)" },
        ],
        evidenceNote: null,
        warningLines: [],
        notes: null,
      },
    ],
    requestedCycles: 6,
    chartedCycles: 1,
    notice: null,
    ...overrides,
  };
}

describe("InstructorChartDocument", () => {
  it("lays the cycle day numbers across the top in order", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const grid = screen.getByTestId("chart-cycle-7");
    const header = within(grid).getAllByTestId("chart-column-day")[0];
    const days = within(grid).getAllByTestId("chart-column-day");
    expect(days.map((d) => d.textContent)).toEqual(["1", "2", "3"]);
    expect(header).toBeTruthy();
  });

  it("gives each observation its own labelled row", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const grid = screen.getByTestId("chart-cycle-7");
    for (const label of ["Date", "Menses", "Monitor", "Fertile window"]) {
      expect(within(grid).getByText(label)).toBeTruthy();
    }
  });

  it("marks the fertile days and leaves the rest unmarked", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const marks = screen.getAllByTestId("chart-window-cell");
    expect(marks.map((m) => m.getAttribute("data-marked"))).toEqual(["false", "true", "true"]);
  });

  it("carries a word for every monitor reading, so colour is never the only cue", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const grid = screen.getByTestId("chart-cycle-7");
    // Two Lows on day 1 and 2, one High on day 3 — all words, never a colour alone.
    expect(within(grid).getAllByText("Low")).toHaveLength(2);
    expect(within(grid).getByText("High")).toBeTruthy();
  });

  it("carries the print-sheet class so the print rules find it", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    expect(screen.getByTestId("chart-sheet").className).toContain("print-sheet");
  });

  it("holds no control the printout would have to hide", () => {
    const { container } = render(
      <InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />,
    );
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("select")).toBeNull();
  });

  it("names each cycle with its number, Day 1, and length", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const grid = screen.getByTestId("chart-cycle-7");
    // The heading is the cycle identity; the caption repeats it, so match the heading specifically.
    expect(within(grid).getByRole("heading", { name: /cycle 7/i })).toBeTruthy();
    // Day 1 appears twice on the block: in the heading and in the date row.
    expect(within(grid).getAllByText(/2026-07-01/).length).toBeGreaterThan(0);
    expect(within(grid).getByText("28 days")).toBeTruthy();
    expect(within(grid).getByText("Peak day 12")).toBeTruthy();
  });

  it("labels an open cycle as in progress rather than settled", () => {
    const open = model();
    open.cycles[0].isOpen = true;
    open.cycles[0].lengthLabel = "In progress — length not yet known";
    render(<InstructorChartDocument model={open} generatedOn="2026-09-28" algorithmEnabled />);
    expect(screen.getByText(/in progress/i)).toBeTruthy();
  });

  it("prints the begin basis and its evidence, marking cycles not on the page", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const begin = screen.getByTestId("chart-cycle-7-begin");
    expect(begin.textContent).toMatch(/calendar rule/i);
    // The claim names the one number it turned on...
    expect(begin.textContent).toMatch(/earliest Peak day 8, cycle 3/i);

    // ...and the evidence line lists every contributing Peak, saying which cycle is on this page.
    const evidence = screen.getByTestId("chart-cycle-7-evidence");
    expect(evidence.textContent).toMatch(/Peak days used/i);
    expect(evidence.textContent).toMatch(/cycle 3 day 8 \(not on this chart\)/);
  });

  it("states the window's days", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    expect(screen.getByTestId("chart-cycle-7-window").textContent).toMatch(/day 2/i);
  });

  it("says when no window end could be determined", () => {
    const noEnd = model();
    noEnd.cycles[0].endDay = null;
    noEnd.cycles[0].endNote =
      "No end determined — the protocol sets the end from a Peak in this cycle, and it has none.";
    render(<InstructorChartDocument model={noEnd} generatedOn="2026-09-28" algorithmEnabled />);
    expect(screen.getByText(/no end determined/i)).toBeTruthy();
  });

  it("carries the protocol warnings the engine raised, and none when there were none", () => {
    const warned = model();
    warned.cycles[0].warningLines = ["No monitor Peak in this cycle, so the protocol sets no end."];
    const { unmount } = render(
      <InstructorChartDocument model={warned} generatedOn="2026-09-28" algorithmEnabled />,
    );
    expect(screen.getByTestId("chart-warnings-7")).toBeTruthy();
    unmount();

    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    expect(screen.queryByTestId("chart-warnings-7")).toBeNull();
  });

  it("shows the recorded data and no band with interpretation off", () => {
    // With interpretation off the *model* omits the window row and the evidence; the document's prop
    // withholds the derived statements. Both halves are exercised here, as the view supplies them.
    const loggingOnly = model();
    loggingOnly.cycles[0].rows = loggingOnly.cycles[0].rows.filter((r) => r.id !== "window");
    loggingOnly.cycles[0].beginRule = null;
    loggingOnly.cycles[0].beginNote = null;
    loggingOnly.cycles[0].evidence = [];

    render(
      <InstructorChartDocument
        model={loggingOnly}
        generatedOn="2026-09-28"
        algorithmEnabled={false}
      />,
    );
    const grid = screen.getByTestId("chart-cycle-7");
    expect(within(grid).getByText("Monitor")).toBeTruthy();
    expect(screen.getByTestId("chart-algorithm-off")).toBeTruthy();
    // The derived half is withheld entirely: no band cells, no window statement, no begin claim.
    expect(screen.queryAllByTestId("chart-window-cell")).toHaveLength(0);
    expect(screen.queryByTestId("chart-cycle-7-window")).toBeNull();
    expect(screen.queryByTestId("chart-cycle-7-begin")).toBeNull();
  });

  it("reaches legibility through theme tokens, not fixed colours", () => {
    // A dark-theme session must not print or preview a dark sheet, and the band must invert with the
    // theme. Both come from tokens the print rules already remap, so the document must not hard-code a
    // background or text colour anywhere.
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const root = screen.getByTestId("chart-sheet");

    expect(root.className).toContain("bg-background");
    expect(root.className).toContain("text-foreground");
    // No hex, rgb(), or hsl() literal in the markup at all.
    expect(root.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(root.outerHTML).not.toMatch(/rgba?\(/i);
    expect(root.outerHTML).not.toMatch(/hsla?\(/i);
    expect(root.getAttribute("style")).toBeNull();
  });

  it("marks the band with a token that inverts in dark mode and prints black", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    const marked = screen
      .getAllByTestId("chart-window-cell")
      .filter((cell) => cell.getAttribute("data-marked") === "true");
    expect(marked).toHaveLength(2);
    for (const cell of marked) {
      // `bg-foreground` is the theme's text colour, so the band is dark in light mode and light in dark
      // mode; the print rule pins it to black. Neither is a fixed colour in the markup.
      expect(cell.className).toContain("bg-foreground");
      expect(cell.className).toContain("print:bg-black");
    }
  });

  it("states the shortfall when fewer cycles exist than were requested", () => {
    const short = model({
      requestedCycles: 12,
      chartedCycles: 1,
      notice: "Charting 1 of 12 cycles requested — only 1 exists.",
    });
    render(<InstructorChartDocument model={short} generatedOn="2026-09-28" algorithmEnabled />);
    expect(screen.getByTestId("chart-notice").textContent).toMatch(/1 of 12/i);
  });

  it("carries the generation date so a saved file is a snapshot", () => {
    render(<InstructorChartDocument model={model()} generatedOn="2026-09-28" algorithmEnabled />);
    expect(screen.getByTestId("chart-snapshot").textContent).toMatch(/2026-09-28/);
  });
});
