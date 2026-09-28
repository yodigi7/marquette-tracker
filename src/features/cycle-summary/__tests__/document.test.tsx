import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { END_RULE_LABELS } from "@/features/status/lib";
import { SummaryDocument } from "../document";
import type { SummaryModel } from "../lib";

afterEach(cleanup);

function model(overrides: Partial<SummaryModel> = {}): SummaryModel {
  return {
    cycleNo: 3,
    day1: "2026-01-01",
    firstDay: 1,
    lastDay: 28,
    open: false,
    length: 28,
    firstPeakDay: 14,
    lastPeakDay: 14,
    peakCount: 1,
    window: {
      begin: 6,
      end: 17,
      days: 12,
      beginBasis: "Set by the calendar rule, not by a reading.",
      beginRule: "calendar rule (cycle day 6)",
      endBasis:
        "Set by your own reading — three full days after the monitor Peak you recorded on cycle day 14.",
      endRule: END_RULE_LABELS["current-peak-plus-n"],
    },
    days: Array.from({ length: 28 }, (_, index) => ({
      day: index + 1,
      date: `2026-01-${String(index + 1).padStart(2, "0")}`,
      monitor: null,
      bloodFlow: index === 0 ? "medium" : null,
      mucus: null,
      bbt: null,
      intercourse: false,
      pregnancyTest: null,
      symptoms: [],
      notes: null,
      unlogged: true,
    })),
    columns: {
      menses: true,
      mucus: false,
      bbt: false,
      intercourse: false,
      pregnancyTest: false,
      symptoms: false,
      notes: false,
    },
    warnings: [],
    ...overrides,
  };
}

function renderDocument(overrides: Partial<SummaryModel> = {}, generatedOn = "2026-09-27") {
  return render(
    <SummaryDocument model={model(overrides)} generatedOn={generatedOn} cycleNotes={null} />,
  );
}

describe("SummaryDocument", () => {
  it("states every value the acceptance list names for a closed cycle", () => {
    renderDocument();

    expect(screen.getByTestId("summary-cycle-no")).toHaveTextContent("3");
    expect(screen.getByTestId("summary-day1")).toHaveTextContent("2026-01-01");
    expect(screen.getByTestId("summary-day-range")).toHaveTextContent("Cycle days 1 to 28");
    expect(screen.getByTestId("summary-length")).toHaveTextContent("28 days");
    expect(screen.getByTestId("summary-peak")).toHaveTextContent("cycle day 14");
  });

  it("states the window's begin and end, and the basis of each", () => {
    renderDocument();

    const window = screen.getByTestId("summary-window");
    expect(window).toHaveTextContent(/cycle day 6 to cycle day 17 \(12 days\)/i);
    expect(window).toHaveTextContent("calendar rule, not by a reading");
    expect(window).toHaveTextContent("Rule: calendar rule (cycle day 6)");
    expect(window).toHaveTextContent(`Rule: ${END_RULE_LABELS["current-peak-plus-n"]}`);
  });

  it("prints the monitor reading as a word per day, which is what survives black and white", () => {
    const withReadings = model({
      days: [
        { ...model().days[0], monitor: "low" },
        { ...model().days[1], monitor: "high" },
        { ...model().days[2], monitor: "peak" },
        ...model().days.slice(3),
      ],
    });

    render(<SummaryDocument model={withReadings} generatedOn="2026-09-27" cycleNotes={null} />);

    const table = screen.getByTestId("summary-table");
    expect(within(table).getByText("Low")).toBeInTheDocument();
    expect(within(table).getByText("High")).toBeInTheDocument();
    expect(within(table).getByText("Peak")).toBeInTheDocument();
    // 25 days hold nothing, so 25 rows say so in words rather than showing a value.
    expect(within(table).getAllByText("No reading logged")).toHaveLength(25);
  });

  it("carries one row per cycle day, including days with no record", () => {
    renderDocument();

    const table = screen.getByTestId("summary-table");
    expect(within(table).getAllByRole("row")).toHaveLength(29); // 28 days + header
  });

  it("exposes each day's monitor reading for a test to assert against", () => {
    const withReadings = model({
      days: [{ ...model().days[0], monitor: "peak" }, ...model().days.slice(1)],
    });

    render(<SummaryDocument model={withReadings} generatedOn="2026-09-27" cycleNotes={null} />);

    expect(screen.getByTestId("summary-day-1")).toHaveAttribute("data-monitor", "peak");
    expect(screen.getByTestId("summary-day-2")).toHaveAttribute("data-monitor", "");
  });

  it("labels an unfinished cycle in progress and puts no length number in the length's place", () => {
    renderDocument({
      open: true,
      length: null,
      lastDay: 17,
      days: model().days.slice(0, 17),
    });

    expect(screen.getByTestId("summary-state")).toHaveTextContent(/in progress/i);
    const length = screen.getByTestId("summary-length");
    expect(length).toHaveTextContent(/not known/i);
    expect(length).not.toHaveTextContent(/\b17 days\b/);
  });

  it("shows the warnings the app raised for the cycle", () => {
    renderDocument({
      warnings: [
        "Monitor reading outside the computed window. Your monitor shows High or Peak on cycle day 22, but the computed window ended on day 17. The window has not changed.",
      ],
    });

    const notes = screen.getByTestId("summary-warnings");
    expect(within(notes).getByText(/cycle day 22/)).toBeInTheDocument();
  });

  it("shows no warnings section for a cycle with no raised warnings", () => {
    renderDocument();

    expect(screen.queryByTestId("summary-warnings")).toBeNull();
  });

  it("adds an optional column only where the cycle holds that value", () => {
    const withMucus = model({
      days: [{ ...model().days[0], mucus: "high" }, ...model().days.slice(1)],
      columns: { ...model().columns, mucus: true },
    });

    const { unmount } = render(
      <SummaryDocument model={withMucus} generatedOn="2026-09-27" cycleNotes={null} />,
    );
    expect(within(screen.getByTestId("summary-table")).getByText("Mucus")).toBeInTheDocument();
    unmount();

    renderDocument();
    const table = screen.getByTestId("summary-table");
    for (const absent of ["Mucus", "Temp", "Intercourse", "Test", "Symptoms", "Notes"]) {
      expect(within(table).queryByText(absent)).toBeNull();
    }
    // Menses was logged on Day 1, so its column is present.
    expect(within(table).getByText("Menses")).toBeInTheDocument();
  });

  it("shows a cycle-level note when one is logged, and no section when there is none", () => {
    const { unmount } = render(
      <SummaryDocument
        model={model()}
        generatedOn="2026-09-27"
        cycleNotes="Away for a week, readings may be patchy."
      />,
    );
    expect(screen.getByTestId("summary-cycle-notes")).toHaveTextContent("Away for a week");
    unmount();

    renderDocument();
    expect(screen.queryByTestId("summary-cycle-notes")).toBeNull();
  });

  it("labels itself a snapshot with its generation date", () => {
    renderDocument({}, "2026-09-27");

    expect(screen.getByTestId("summary-snapshot")).toHaveTextContent("2026-09-27");
    expect(screen.getByTestId("summary-snapshot")).toHaveTextContent(/does not update/i);
  });

  it("states that predictions and projected cycles are excluded", () => {
    renderDocument();

    expect(screen.getByTestId("summary-exclusions")).toHaveTextContent(/not included/i);
    expect(screen.getByTestId("summary-exclusions")).toHaveTextContent(/projected future cycles/i);
  });

  it("prints no confirmed or predicted window cue anywhere", () => {
    renderDocument({
      warnings: ["Monitor reading outside the computed window."],
    });

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/confirmed window|predicted window/i);
    expect(text).not.toMatch(/\bconfirmed\b|\bpredicted\b/i);
  });

  it("carries the print sheet class so the print rules can find it", () => {
    renderDocument();

    expect(screen.getByTestId("summary-sheet")).toHaveClass("print-sheet");
  });

  it("holds no control the printout would have to hide", () => {
    renderDocument();

    // Every control in the document would reach the paper. Printing is driven from outside the sheet.
    expect(screen.getByTestId("summary-sheet").querySelectorAll("button, a, input")).toHaveLength(
      0,
    );
  });
});

describe("SummaryDocument with interpretation off", () => {
  it("produces a raw log and no window, no Peak day, and no protocol notes", () => {
    render(
      <SummaryDocument
        model={model({
          window: null,
          firstPeakDay: null,
          lastPeakDay: null,
          warnings: [],
          days: [
            { ...model().days[0], monitor: "peak" },
            { ...model().days[1], monitor: "low" },
            ...model().days.slice(2),
          ],
        })}
        generatedOn="2026-09-27"
        cycleNotes={null}
        algorithmEnabled={false}
      />,
    );

    expect(screen.queryByTestId("summary-window")).toBeNull();
    expect(screen.queryByTestId("summary-warnings")).toBeNull();
    // The logged readings are still there — the raw log is the point.
    const table = screen.getByTestId("summary-table");
    expect(within(table).getByText("Peak")).toBeInTheDocument();
    expect(within(table).getByText("Low")).toBeInTheDocument();
  });

  it("says why the derived half is missing", () => {
    render(
      <SummaryDocument
        model={model({ window: null, firstPeakDay: null, lastPeakDay: null, warnings: [] })}
        generatedOn="2026-09-27"
        cycleNotes={null}
        algorithmEnabled={false}
      />,
    );

    expect(screen.getByTestId("summary-algorithm-off")).toHaveTextContent(/algorithm is off/i);
  });

  it("omits the Peak day row with interpretation off rather than claiming none was read", () => {
    // Found in the browser pass: the row used to read "No monitor Peak reading recorded in this
    // cycle" while the raw log directly below showed two Peak readings. The engine reports no Peak
    // day because it was not computed, not because none exists.
    render(
      <SummaryDocument
        model={model({
          window: null,
          firstPeakDay: null,
          lastPeakDay: null,
          peakCount: 2,
          warnings: [],
          days: [
            { ...model().days[0], monitor: "peak" },
            { ...model().days[1], monitor: "peak" },
            ...model().days.slice(2),
          ],
        })}
        generatedOn="2026-09-27"
        cycleNotes={null}
        algorithmEnabled={false}
      />,
    );

    expect(screen.queryByTestId("summary-peak")).toBeNull();
    expect(document.body.textContent).not.toMatch(/no monitor peak reading recorded/i);
    // The readings are still in the log, which is the raw log's whole job.
    expect(within(screen.getByTestId("summary-table")).getAllByText("Peak")).toHaveLength(2);
  });
});
