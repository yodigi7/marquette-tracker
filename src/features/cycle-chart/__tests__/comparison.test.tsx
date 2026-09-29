import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { useAppStore } from "@/core/store/useAppStore";
import { CycleComparisonView } from "../comparison";
import { installChartShim, resetStore, seedCycles } from "./helpers";

installChartShim();

function renderComparison() {
  return render(
    <MemoryRouter initialEntries={["/cycle-compare"]}>
      <Routes>
        <Route path="/cycle-compare" element={<CycleComparisonView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CycleComparisonView", () => {
  afterEach(() => cleanup());

  it("shows the empty state when no cycles exist", async () => {
    await resetStore();
    renderComparison();
    expect(screen.getByTestId("comparison-view-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-comparison-chart")).toBeNull();
  });

  it("defaults to the most recent N cycles where N = historyWindow", async () => {
    const { a, b } = await seedCycles();
    void a;
    void b;
    // seedCycles creates 2 cycles; default historyWindow is 6, so both should show
    renderComparison();
    const bands = screen.getAllByTestId("comparison-day-band");
    // Cycle A: 28 days, Cycle B: 6 days (open) — both should have bands
    expect(bands.length).toBeGreaterThan(0);
    // Both cycles should appear, each with a row label and a legend toggle
    expect(screen.getAllByText(/Cycle 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cycle 2/).length).toBeGreaterThan(0);
  });

  it("changes the number of recent cycles when N is updated", async () => {
    await seedCycles();
    renderComparison();

    // Both cycles should show by default
    let legendItems = screen.getAllByTestId("comparison-legend-item");
    expect(legendItems).toHaveLength(2);

    // Change N to 1 — only the most recent cycle should show
    const nInput = screen.getByTestId("comparison-n-input");
    fireEvent.change(nInput, { target: { value: "1" } });

    // Wait for the re-render
    await waitFor(() => {
      expect(screen.getAllByTestId("comparison-legend-item")).toHaveLength(1);
    });
    legendItems = screen.getAllByTestId("comparison-legend-item");
    expect(legendItems[0].textContent).toContain("Cycle 2");
  });

  it("respects the algorithm toggle — no window bands when disabled", async () => {
    const { a } = await seedCycles();
    void a;
    await useAppStore.getState().updateSettings({ algorithmEnabled: false });
    renderComparison();

    // Bands should still render
    expect(screen.getAllByTestId("comparison-day-band").length).toBeGreaterThan(0);
    // No window bands
    expect(screen.queryByTestId("comparison-window-band")).toBeNull();
  });

  it("renders window bands when the algorithm is enabled", async () => {
    const { a } = await seedCycles();
    void a;
    renderComparison();
    expect(screen.getAllByTestId("comparison-window-band").length).toBeGreaterThan(0);
  });

  it("handles a single cycle without error", async () => {
    await resetStore();
    const start = "2026-01-01";
    const cycle = await useAppStore.getState().setNewCycle(start);
    await useAppStore.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await useAppStore.getState().addDayRecord(cycle.id, "2026-01-14", 14, { monitor: "peak" });

    renderComparison();
    expect(screen.getAllByTestId("comparison-day-band").length).toBeGreaterThan(0);
  });

  it("handles an open cycle only without error", async () => {
    await resetStore();
    const start = "2026-01-01";
    const cycle = await useAppStore.getState().setNewCycle(start);
    // Add a few records to the open cycle
    await useAppStore.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await useAppStore.getState().addDayRecord(cycle.id, "2026-01-03", 3, { monitor: "low" });

    renderComparison();
    expect(screen.getAllByTestId("comparison-day-band").length).toBeGreaterThan(0);
  });
});

describe("CycleComparisonView colour identity", () => {
  afterEach(() => cleanup());

  /** Four logged cycles, returned oldest first as the store holds them. */
  async function seedFourCycles(): Promise<string[]> {
    await resetStore();
    const ids: string[] = [];
    for (const day1 of ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"]) {
      const { id } = await useAppStore.getState().setNewCycle(day1);
      ids.push(id);
    }
    return ids;
  }

  const colorOf = (cycleId: string): string | null =>
    screen
      .getAllByTestId("comparison-legend-item")
      .find((el) => el.dataset.cycleId === cycleId)
      ?.getAttribute("data-color") ?? null;

  const customCheckbox = (cycleNo: number): HTMLInputElement => {
    const labels = screen.getByTestId("comparison-custom-picker").querySelectorAll("label");
    const match = Array.from(labels).find((l) => l.textContent?.startsWith(`Cycle ${cycleNo} `));
    return match!.querySelector("input")!;
  };

  it("does not repaint the cycles that remain when the cycle count changes", async () => {
    const ids = await seedFourCycles();
    renderComparison();
    // All four show at the default history window; record what each one wears.
    const before = new Map(ids.map((id) => [id, colorOf(id)]));
    expect(before.get(ids[3])).not.toBeNull();

    fireEvent.change(screen.getByTestId("comparison-n-input"), { target: { value: "2" } });

    // Locks a stated requirement. Note this case alone does not distinguish the
    // anchored rule from a selection-anchored one: "most recent N" is always a
    // prefix of the newest-first list, so survivors keep their slot either way.
    // Hand-picking below is the case that actually separates the two rules.
    for (const id of [ids[3], ids[2]]) {
      expect(colorOf(id)).toBe(before.get(id));
    }
  });

  it("does not repaint when cycles are hand-picked instead", async () => {
    const ids = await seedFourCycles();
    renderComparison();
    const before = new Map(ids.map((id) => [id, colorOf(id)]));

    fireEvent.change(screen.getByTestId("comparison-mode"), { target: { value: "custom" } });
    // Pick a scattered set: the oldest and the newest, skipping the middle two.
    fireEvent.click(customCheckbox(1));
    fireEvent.click(customCheckbox(4));

    for (const id of [ids[0], ids[3]]) {
      expect(colorOf(id)).toBe(before.get(id));
    }
  });

  it("derives the same colours every time the view reads the data", async () => {
    const ids = await seedFourCycles();
    renderComparison();
    const first = new Map(ids.map((id) => [id, colorOf(id)]));

    // Switch selection mode and back, so the view re-reads and re-derives.
    fireEvent.change(screen.getByTestId("comparison-mode"), { target: { value: "custom" } });
    fireEvent.change(screen.getByTestId("comparison-mode"), { target: { value: "recent" } });

    for (const id of ids) {
      expect(colorOf(id)).toBe(first.get(id));
    }
  });

  it("never gives two selected cycles the same colour", async () => {
    const ids = await seedFourCycles();
    renderComparison();
    const colors = ids.map((id) => colorOf(id));
    expect(new Set(colors).size).toBe(colors.length);
  });
});
