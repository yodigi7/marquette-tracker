import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { seedDemoData } from "@/core/store/seedDemo";
import { useAppStore } from "@/core/store/useAppStore";
import { addDays } from "@/core/engine/dateUtils";
import { todayKey } from "@/core/dateKeys";
import { MemoryRouter, Route, Routes } from "react-router";
import { CalendarView } from "@/features/calendar";
import { CycleChartView } from "@/features/cycle-chart";
import { installChartShim } from "@/features/cycle-chart/__tests__/helpers";
import { HistoryView } from "../index";

installChartShim();

const store = () => useAppStore.getState();

async function boot() {
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().clearAllData();
  await seedDemoData();
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().hydrate();
}

describe("HistoryView", () => {
  beforeEach(boot);
  afterEach(() => cleanup());

  it("renders stats, forecast, and a cycle table from seeded data", async () => {
    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg length/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Peak day/i).length).toBeGreaterThanOrEqual(1);
    // One table row per seeded cycle.
    expect(screen.getAllByRole("row")).toHaveLength(7); // header + 6 cycles
  });

  it("updates the open cycle live when a day record is added", async () => {
    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Forecast/i)).toBeInTheDocument();

    const open = store().cycles.find((c) => c.closedAt === null)!;
    expect(store().output!.cycles.find((c) => c.cycleId === open.id)!.peakDay).toBeNull();

    // Derive the target from the stored records, not the engine's day array:
    // day results now span the cycle, so their last entry is "today", not the
    // last day the user actually recorded.
    const lastDay = Math.max(
      ...store()
        .dayRecords.filter((r) => r.cycleId === open.id)
        .map((r) => r.dayInCycle),
    );
    const lastDate = addDays(open.day1, lastDay - 1);
    await store().addDayRecord(open.id, lastDate, lastDay, { monitor: "peak" });

    // Engine output recomputes so the open cycle now has a Peak day.
    await waitFor(() => {
      expect(store().output!.cycles.find((c) => c.cycleId === open.id)!.peakDay).not.toBeNull();
    });

    // The open cycle's table row re-renders to show its new Peak day.
    const openRow = screen.getAllByRole("row").find((r) => r.textContent?.includes("Open"));
    expect(openRow).toBeTruthy();
    expect(openRow!.textContent).toContain(`day ${lastDay}`);
  });

  it("uses shared text and predictive tokens in the forecast and stats panels", async () => {
    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    expect(screen.getByText("predicted")).toHaveClass("text-fertility-forecast-fg");
    expect(screen.getByText("Avg length")).toHaveClass("text-fertility-muted");
    expect(screen.getByText("Next fertile window")).toHaveClass("text-fertility-muted");
  });

  it("renders the protocol-band warning with the shared warning token", () => {
    const output = store().output;
    if (!output?.forecast) {
      throw new Error("Expected seeded forecast output");
    }

    useAppStore.setState({
      output: {
        ...output,
        forecast: { ...output.forecast, outOfBandCount: 2 },
      },
    });

    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    expect(screen.getByText(/2 cycles fell outside the 21–42 day band/i)).toHaveClass(
      "text-fertility-warning",
    );
  });

  it("reports how many cycles have monitor data that disagrees with the computed window", () => {
    const output = store().output;
    if (!output) {
      throw new Error("Expected seeded engine output");
    }

    const cycles = output.cycles.map((cycle, index) =>
      index === 0
        ? {
            ...cycle,
            warnings: [
              ...cycle.warnings,
              { kind: "monitor-evidence-outside-window" as const, cycleNo: cycle.cycleNo, day: 15 },
            ],
          }
        : cycle,
    );

    useAppStore.setState({ output: { ...output, cycles } });

    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    const notice = screen.getByTestId("history-reconciliation-warning");
    expect(notice).toHaveTextContent(/1 cycle has a monitor reading/i);
    expect(notice).toHaveClass("text-fertility-warning");
  });

  it("shows no reconciliation notice when every cycle agrees with its window", () => {
    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("history-reconciliation-warning")).toBeNull();
  });

  it("hides computed summaries in logging-only mode and restores them when re-enabled", async () => {
    await store().clearAllData();
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: "peak" });
    await store().updateSettings({ algorithmEnabled: false });

    const { rerender } = render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("history-logging-only")).toBeInTheDocument();
    expect(screen.queryByText("Avg length")).toBeNull();
    expect(screen.queryByText("Fertile days")).toBeNull();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    // Only the two logged days exist; nothing is synthesized.
    expect(store().dayRecords).toHaveLength(2);

    await store().updateSettings({ algorithmEnabled: true });
    rerender(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    expect(screen.getByText("Avg length")).toBeInTheDocument();
    expect(screen.getAllByText("Fertile days").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("history-logging-only")).toBeNull();
  });

  it("navigates to the cycle chart when a cycle row is clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <Routes>
          <Route path="/history" element={<HistoryView />} />
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole("row");
    const dataRow = rows.find(
      (r) => r.textContent?.includes("Open") || r.textContent?.includes("Closed"),
    );
    expect(dataRow).toBeTruthy();

    fireEvent.click(dataRow!);

    await waitFor(() => {
      expect(screen.queryByTestId("cycle-chart-empty")).toBeNull();
    });
  });

  it("navigates to the cycle chart when the cycle link is activated", async () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <Routes>
          <Route path="/history" element={<HistoryView />} />
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );

    const links = await screen.findAllByRole("link", { name: /Cycle \d+, Day 1/ });
    expect(links.length).toBeGreaterThan(0);
    fireEvent.click(links[0]);

    await waitFor(() => {
      expect(screen.queryByTestId("cycle-chart-empty")).toBeNull();
    });
  });

  it("navigates for both open and closed cycle rows", async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/history"]}>
        <Routes>
          <Route path="/history" element={<HistoryView />} />
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );

    let rows = await screen.findAllByRole("row");
    const openRow = rows.find((r) => r.textContent?.includes("Open"));
    expect(openRow).toBeTruthy();
    fireEvent.click(openRow!);
    await waitFor(() => expect(screen.queryByTestId("cycle-chart-empty")).toBeNull());
    unmount();

    render(
      <MemoryRouter initialEntries={["/history"]}>
        <Routes>
          <Route path="/history" element={<HistoryView />} />
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );

    rows = await screen.findAllByRole("row");
    const closedRow = rows.find((r) => r.textContent?.includes("Closed"));
    expect(closedRow).toBeTruthy();
    fireEvent.click(closedRow!);
    await waitFor(() => expect(screen.queryByTestId("cycle-chart-empty")).toBeNull());
  });

  it("keeps cycle rows navigable when the algorithm is disabled", async () => {
    await store().clearAllData();
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: "peak" });
    await store().updateSettings({ algorithmEnabled: false });

    render(
      <MemoryRouter initialEntries={["/history"]}>
        <Routes>
          <Route path="/history" element={<HistoryView />} />
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole("row");
    const dataRow = rows.find((r) => r.textContent?.includes("Open"));
    expect(dataRow).toBeTruthy();

    fireEvent.click(dataRow!);
    await waitFor(() => expect(screen.queryByTestId("cycle-chart-empty")).toBeNull());
  });

  it("falls back to the newest cycle for an unknown cycle id", async () => {
    render(
      <MemoryRouter initialEntries={["/cycle/nonexistent-id"]}>
        <Routes>
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );

    // Unknown id falls back to the newest cycle, not the empty state.
    expect(await screen.findByTestId("cycle-selector")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-chart-empty")).toBeNull();
  });

  it("shows the empty state when there are no cycles", async () => {
    await store().clearAllData();
    useAppStore.setState({ hydrated: false });
    await useAppStore.getState().hydrate();

    render(
      <MemoryRouter initialEntries={["/cycle/nonexistent-id"]}>
        <Routes>
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("cycle-chart-empty")).toBeInTheDocument();
  });
});

describe("HistoryView peak-day statistics", () => {
  beforeEach(boot);
  afterEach(() => cleanup());

  it("reports the Peak-day range and no average Peak day", async () => {
    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Peak day range")).toBeInTheDocument();
    // the protocol yields a range, never a central day
    expect(screen.queryByText("Peak day (avg)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Peak day \(avg\)/)).not.toBeInTheDocument();
  });

  it("renders no single-day ovulation estimate on any surface", async () => {
    // the protocol's calendar rule yields a range, so no surface may mark one
    // ovulatory day: not the stats, not the Calendar, not the Cycle chart
    const stats = render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Peak day range")).toBeInTheDocument();
    expect(screen.queryByText(/Peak day \(avg\)/)).not.toBeInTheDocument();
    expect(document.querySelectorAll('[title="Predicted ovulation"]')).toHaveLength(0);
    stats.unmount();

    const calendar = render(<CalendarView />);
    await waitFor(() => expect(screen.getAllByTestId("day-cell").length).toBeGreaterThan(0));
    expect(document.querySelectorAll('[title="Predicted ovulation"]')).toHaveLength(0);
    expect(screen.queryByText("Predicted ovulation")).not.toBeInTheDocument();
    calendar.unmount();

    const cycleId = store().cycles[0]?.id;
    const chart = render(
      <MemoryRouter initialEntries={cycleId ? [`/cycle/${cycleId}`] : ["/cycle"]}>
        <Routes>
          <Route path="/cycle" element={<CycleChartView />} />
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(document.querySelector('[data-testid="cycle-chart-empty"]')).toBeNull(),
    );
    expect(document.querySelectorAll('[title="Predicted ovulation"]')).toHaveLength(0);
    chart.unmount();
  });

  it("names the estimator behind the projected dates", async () => {
    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    const disclosure = await screen.findByText(/Projected dates use the median/i);
    const forecast = store().output?.forecast;
    expect(forecast).not.toBeNull();
    // the fixture must actually exercise the "fewer cycles than configured"
    // branch, otherwise this test would pass while covering nothing
    expect(forecast!.lookbackWindow).toBeLessThan(forecast!.configuredLookbackWindow);
    expect(disclosure.textContent).toContain(`last ${forecast!.lookbackWindow} completed cycle`);
    expect(disclosure.textContent).toContain(
      `configured window of ${forecast!.configuredLookbackWindow}`,
    );
    // and it is explicit that the displayed averages are not the source
    expect(disclosure.textContent).toMatch(/not what produces them/);
  });

  it("reports no projection and names no estimator without a closed cycle", async () => {
    await store().clearAllData();
    useAppStore.setState({ hydrated: false });
    await useAppStore.getState().hydrate();
    render(
      <MemoryRouter>
        <HistoryView />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Not enough data yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Projected dates use the median/i)).not.toBeInTheDocument();
  });
});
