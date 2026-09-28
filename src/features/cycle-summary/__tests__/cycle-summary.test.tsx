import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { addDays } from "@/core/engine/dateUtils";
import { todayKey } from "@/core/dateKeys";
import { useAppStore } from "@/core/store/useAppStore";
import { SummaryView } from "../index";

const store = () => useAppStore.getState();

/** The store is a module singleton and fake-indexeddb persists per file, so each test starts empty. */
beforeEach(async () => {
  useAppStore.setState({ hydrated: false });
  await store().hydrate();
  await store().clearAllData();
});

afterEach(cleanup);

function renderAt(cycleId: string) {
  return render(
    <MemoryRouter initialEntries={[`/summary/${cycleId}`]}>
      <Routes>
        <Route path="/summary/:cycleId" element={<SummaryView />} />
        <Route path="/cycle/:cycleId" element={<p>chart view</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * A cycle that closes itself: a second cycle starting later makes the first one closed, and the engine
 * derives length and window from the day1 ordering.
 */
async function closedCycleWithPeak(peakDay = 12) {
  const start = addDays(todayKey(), -40);
  const first = await store().setNewCycle(start);
  await store().addDayRecord(first.id, start, 1, { bloodFlow: "medium" });
  await store().addDayRecord(first.id, addDays(start, peakDay - 1), peakDay, {
    monitor: "peak",
    mucus: "high",
  });
  // Close it by starting the next cycle.
  await store().setNewCycle(addDays(start, 28));
  return first.id;
}

describe("SummaryView", () => {
  it("states every value the acceptance list names for a closed cycle", async () => {
    const cycleId = await closedCycleWithPeak(12);
    renderAt(cycleId);

    expect(await screen.findByTestId("summary-cycle-no")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-day1")).toBeInTheDocument();
    expect(screen.getByTestId("summary-day-range")).toHaveTextContent(/cycle days 1 to 28/i);
    expect(screen.getByTestId("summary-length")).toHaveTextContent("28 days");
    expect(screen.getByTestId("summary-peak")).toHaveTextContent(/cycle day 12/);
    expect(screen.getByTestId("summary-window")).toHaveTextContent(
      /cycle day \d+ to cycle day \d+/i,
    );
  });

  it("names the rule that produced the window, in plain language", async () => {
    const cycleId = await closedCycleWithPeak(12);
    renderAt(cycleId);

    const window = await screen.findByTestId("summary-window");
    expect(window).toHaveTextContent(/opened by/i);
    expect(window).toHaveTextContent(/closed by/i);
    expect(window).toHaveTextContent(/rule:/i);
  });

  it("prints no confirmed or predicted window cue anywhere on the document", async () => {
    const cycleId = await closedCycleWithPeak(12);
    renderAt(cycleId);

    await screen.findByTestId("summary-sheet");
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/confirmed|predicted/i);
  });

  it("reports a protocol warning the app raised for the cycle", async () => {
    // A High after the computed window end: the contradiction the engine reports rather than resolves.
    const start = addDays(todayKey(), -40);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 11), 12, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 24), 25, { monitor: "high" });
    await store().setNewCycle(addDays(start, 28));

    renderAt(cycle.id);

    const warnings = await screen.findByTestId("summary-warnings");
    expect(within(warnings).getByText(/cycle day 25/)).toBeInTheDocument();
    expect(within(warnings).getByText(/window has not changed/i)).toBeInTheDocument();
  });

  it("labels an unfinished cycle in progress rather than settled", async () => {
    const start = addDays(todayKey(), -16);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 11), 12, { monitor: "peak" });

    renderAt(cycle.id);

    expect(await screen.findByTestId("summary-state")).toHaveTextContent(/in progress/i);
    expect(screen.getByTestId("summary-length")).toHaveTextContent(/not known/i);
    expect(screen.getByTestId("summary-length")).not.toHaveTextContent(/\b17 days\b/);
  });

  it("produces a raw log and no window, Peak day, or notes with interpretation off", async () => {
    const cycleId = await closedCycleWithPeak(12);
    await store().updateSettings({ algorithmEnabled: false });

    renderAt(cycleId);

    expect(await screen.findByTestId("summary-algorithm-off")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-window")).toBeNull();
    expect(screen.queryByTestId("summary-warnings")).toBeNull();
    // The raw log is still there, and it still carries the Peak reading that was logged.
    const table = screen.getByTestId("summary-table");
    expect(within(table).getByText("Peak")).toBeInTheDocument();
    expect(within(table).getByText("Mucus")).toBeInTheDocument();
  });

  it("labels the document a snapshot carrying its generation date", async () => {
    const cycleId = await closedCycleWithPeak(12);
    renderAt(cycleId);

    expect(await screen.findByTestId("summary-snapshot")).toHaveTextContent(todayKey());
    expect(screen.getByTestId("summary-exclusions")).toHaveTextContent(/not included/i);
  });

  it("hands the document to the browser to print, and generates no file of its own", async () => {
    const cycleId = await closedCycleWithPeak(12);
    const printed = vi.fn();
    vi.stubGlobal("print", printed);
    // The app can generate a data export from Settings; printing a summary must
    // still be the browser's own action and produce nothing itself.
    const objectUrl = vi.fn(() => "blob:summary");
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: objectUrl });

    renderAt(cycleId);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId("summary-print"));

    expect(printed).toHaveBeenCalledTimes(1);
    expect(objectUrl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("keeps the print control and the way back off the printed page", async () => {
    const cycleId = await closedCycleWithPeak(12);
    renderAt(cycleId);

    const sheet = await screen.findByTestId("summary-sheet");
    // Everything outside the sheet is chrome, and every one of it is print-hidden.
    const toolbar = screen.getByTestId("summary-toolbar");
    expect(sheet.contains(toolbar)).toBe(false);
    expect(toolbar).toHaveClass("print:hidden");
  });

  it("names the page after the cycle, so a saved file can be found", async () => {
    const cycleId = await closedCycleWithPeak(12);
    const before = document.title;

    const { unmount } = renderAt(cycleId);
    await screen.findByTestId("summary-sheet");
    expect(document.title).toBe(`Marquette cycle summary - cycle 1 - ${todayKey()}`);

    unmount();
    expect(document.title).toBe(before);
  });

  it("renders no projected cycle day, and the same document, with future cycles projected on", async () => {
    const cycleId = await closedCycleWithPeak(12);
    await store().updateSettings({ projectFutureCycles: false });

    const first = renderAt(cycleId);
    await screen.findByTestId("summary-sheet");
    const withoutProjection = screen.getByTestId("summary-sheet").textContent;
    const rowsWithout = within(screen.getByTestId("summary-table")).getAllByRole("row").length;
    first.unmount();

    await store().updateSettings({ projectFutureCycles: true });
    renderAt(cycleId);
    await screen.findByTestId("summary-sheet");
    const withProjection = screen.getByTestId("summary-sheet").textContent;
    const rowsWith = within(screen.getByTestId("summary-table")).getAllByRole("row").length;

    expect(withProjection).toBe(withoutProjection);
    expect(rowsWith).toBe(rowsWithout);
  });

  it("shows an empty state with a way back to the Calendar for an unknown cycle", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderAt("does-not-exist");

      expect(await screen.findByTestId("summary-empty")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /calendar/i })).toHaveAttribute("href", "/");
      expect(screen.queryByTestId("summary-sheet")).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("writes nothing when a summary is opened", async () => {
    const cycleId = await closedCycleWithPeak(12);
    const before = await store().createBackup();
    const beforeCycles = before.data.cycles.length;
    const beforeRecords = before.data.dayRecords.length;

    renderAt(cycleId);
    await screen.findByTestId("summary-sheet");

    const after = await store().createBackup();
    expect(after.data.cycles).toHaveLength(beforeCycles);
    expect(after.data.dayRecords).toHaveLength(beforeRecords);
  });
});
