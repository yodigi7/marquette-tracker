import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { addDays } from "@/core/engine/dateUtils";
import { todayKey } from "@/core/dateKeys";
import { useAppStore } from "@/core/store/useAppStore";
import { InstructorChartView } from "../index";

const store = () => useAppStore.getState();

beforeEach(async () => {
  useAppStore.setState({ hydrated: false });
  await store().hydrate();
  await store().clearAllData();
});

afterEach(cleanup);

function renderAt(path = "/instructor-chart") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/instructor-chart" element={<InstructorChartView />} />
        <Route path="/history" element={<p>history view</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** N closed cycles, each a month apart, the last with a monitor Peak on the given day. */
async function logCycles(count: number, peakDay = 12) {
  const start = todayKey();
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const day1 = addDays(start, -count * 28 + i * 28);
    const cycle = await store().setNewCycle(day1);
    await store().addDayRecord(cycle.id, day1, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(day1, peakDay - 1), peakDay, { monitor: "peak" });
    ids.push(cycle.id);
  }
  // A final cycle with no records, so there is always an open one on the end.
  const open = await store().setNewCycle(addDays(start, -28 + count * 28));
  ids.push(open.id);
  return ids;
}

describe("InstructorChartView", () => {
  it("defaults the run to the configured history window", async () => {
    await store().updateSettings({ historyWindow: 3 });
    await logCycles(5);
    renderAt();

    const control = await screen.findByTestId("chart-count");
    expect((control as HTMLInputElement).value).toBe("3");
    expect(await screen.findByTestId("chart-cycle-4")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-cycle-1")).not.toBeInTheDocument();
  });

  it("charts six cycles when the history window is untouched", async () => {
    // The protocol's own window, and the monitor's own six-cycle memory, reached without asking for a
    // number anywhere.
    await logCycles(7);
    renderAt();

    expect((await screen.findByTestId("chart-count")).getAttribute("value")).toBe("6");
    // Seven logged cycles plus the open one is eight, so the run of six is cycles 3 through 8.
    expect(await screen.findByTestId("chart-cycle-8")).toBeInTheDocument();
    expect(screen.getByTestId("chart-cycle-3")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-cycle-2")).not.toBeInTheDocument();
  });

  it("restores the band when interpretation is turned back on", async () => {
    await logCycles(3);
    renderAt();
    expect((await screen.findAllByTestId("chart-window-cell")).length).toBeGreaterThan(0);

    await store().updateSettings({ algorithmEnabled: false });
    expect(await screen.findByTestId("chart-algorithm-off")).toBeInTheDocument();
    expect(screen.queryAllByTestId("chart-window-cell")).toHaveLength(0);

    await store().updateSettings({ algorithmEnabled: true });
    expect((await screen.findAllByTestId("chart-window-cell")).length).toBeGreaterThan(0);
    // No recorded data was lost on the way through.
    expect(screen.getByTestId("chart-cycle-3")).toBeInTheDocument();
  });

  it("honours an explicit count from the URL", async () => {
    await logCycles(5);
    renderAt("/instructor-chart?cycles=2");

    const control = await screen.findByTestId("chart-count");
    expect((control as HTMLInputElement).value).toBe("2");
    expect(await screen.findByTestId("chart-cycle-6")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-cycle-4")).not.toBeInTheDocument();
  });

  it("changes the run and keeps the control off the printed page", async () => {
    await logCycles(5);
    renderAt();

    // The whole toolbar is chrome, so none of it — the count control included — reaches paper.
    expect(screen.getByTestId("chart-toolbar").className).toContain("print:hidden");

    const control = await screen.findByTestId("chart-count");
    await userEvent.clear(control);
    await userEvent.type(control, "2");

    expect(await screen.findByTestId("chart-cycle-6")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-cycle-3")).not.toBeInTheDocument();
  });

  it("states the shortfall when fewer cycles exist than requested", async () => {
    await logCycles(2);
    renderAt("/instructor-chart?cycles=12");

    expect(await screen.findByTestId("chart-notice")).toHaveTextContent(/3 of 12/i);
  });

  it("hands the document to the browser to print and writes no file", async () => {
    const printed = vi.fn();
    vi.stubGlobal("print", printed);
    await logCycles(3);
    renderAt();

    const before = JSON.stringify(store().cycles);
    await userEvent.click(await screen.findByTestId("chart-print"));

    expect(printed).toHaveBeenCalledTimes(1);
    // Nothing is written, changed, or deleted by reading or printing the chart.
    expect(JSON.stringify(store().cycles)).toBe(before);
    vi.unstubAllGlobals();
  });

  it("renders nothing but a route back when no cycles exist", async () => {
    renderAt();

    expect(await screen.findByTestId("chart-empty-view")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument();
    expect(screen.queryByTestId("chart-sheet")).not.toBeInTheDocument();
  });

  it("shows the recorded readings and no window when interpretation is off", async () => {
    await store().updateSettings({ algorithmEnabled: false });
    await logCycles(3);
    renderAt();

    expect(await screen.findByTestId("chart-algorithm-off")).toBeInTheDocument();
    expect(screen.queryAllByTestId("chart-window-cell")).toHaveLength(0);
  });

  it("prints the begin evidence for a cycle past the sixth", async () => {
    // Eight cycles, so cycle 8's window is the previous six and the calendar rule genuinely ran.
    const start = todayKey();
    for (let i = 0; i < 8; i++) {
      const day1 = addDays(start, -8 * 28 + i * 28);
      const cycle = await store().setNewCycle(day1);
      await store().addDayRecord(cycle.id, day1, 1, { bloodFlow: "medium" });
      await store().addDayRecord(cycle.id, addDays(day1, 11), 12, { monitor: "peak" });
    }
    // Charting a single cycle, the whole lookback sits off the page — which is the case the evidence
    // line exists for.
    renderAt("/instructor-chart?cycles=1");

    const block = await screen.findByTestId("chart-cycle-8");
    expect(block).toHaveTextContent(/calendar rule/i);

    const evidence = screen.getByTestId("chart-cycle-8-evidence");
    expect(evidence).toHaveTextContent(/Peak days used/i);
    // The contributing cycles are named and each says it is not on this page.
    expect(evidence).toHaveTextContent(/not on this chart/i);
  });

  it("marks contributing Peaks as charted when the run covers the whole window", async () => {
    const start = todayKey();
    for (let i = 0; i < 8; i++) {
      const day1 = addDays(start, -8 * 28 + i * 28);
      const cycle = await store().setNewCycle(day1);
      await store().addDayRecord(cycle.id, day1, 1, { bloodFlow: "medium" });
      await store().addDayRecord(cycle.id, addDays(day1, 11), 12, { monitor: "peak" });
    }
    renderAt("/instructor-chart?cycles=6");

    const evidence = await screen.findByTestId("chart-cycle-8-evidence");
    expect(evidence).toHaveTextContent(/charted on this page/i);
  });
});
