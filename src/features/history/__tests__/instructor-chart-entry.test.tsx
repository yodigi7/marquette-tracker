import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { useAppStore } from "@/core/store/useAppStore";
import { addDays } from "@/core/engine/dateUtils";
import { todayKey } from "@/core/dateKeys";
import { HistoryView } from "../index";

const store = () => useAppStore.getState();

beforeEach(async () => {
  useAppStore.setState({ hydrated: false });
  await store().hydrate();
  await store().clearAllData();
});

afterEach(cleanup);

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/history"]}>
      <Routes>
        <Route path="/history" element={<HistoryView />} />
        <Route path="/instructor-chart" element={<p>instructor chart view</p>} />
        <Route path="/cycle/:cycleId" element={<p>cycle chart view</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function logCycles(count: number) {
  const start = todayKey();
  for (let i = 0; i < count; i++) {
    const day1 = addDays(start, -count * 28 + i * 28);
    const cycle = await store().setNewCycle(day1);
    await store().addDayRecord(cycle.id, day1, 1, { bloodFlow: "medium" });
  }
}

describe("HistoryView — instructor chart entry point", () => {
  it("offers the chart when cycles exist", async () => {
    await logCycles(2);
    renderAt();
    expect(await screen.findByTestId("history-instructor-chart")).toBeInTheDocument();
  });

  it("does not offer the chart when no cycles exist", async () => {
    renderAt();
    expect(await screen.findByText(/No cycles logged yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("history-instructor-chart")).not.toBeInTheDocument();
  });

  it("navigates to the chart view", async () => {
    await logCycles(2);
    renderAt();
    await userEvent.click(await screen.findByTestId("history-instructor-chart"));
    expect(await screen.findByText("instructor chart view")).toBeInTheDocument();
  });

  it("is reachable and activatable without a pointer", async () => {
    await logCycles(2);
    renderAt();
    const link = await screen.findByTestId("history-instructor-chart");

    // A sibling of the table, so the whole-row navigation to the cycle chart is untouched.
    expect(link.tagName).toBe("A");
    link.focus();
    expect(link).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("instructor chart view")).toBeInTheDocument();
  });

  it("names itself the instructor chart, not a data export", async () => {
    await logCycles(2);
    renderAt();
    const link = await screen.findByTestId("history-instructor-chart");
    const name = link.textContent ?? "";

    expect(name).toMatch(/instructor chart/i);
    // The Settings row owns the word "export" for files. Reusing it here is what confused the user the
    // first time, so the verb is kept distinct.
    expect(name).not.toMatch(/export/i);
  });

  it("leaves cycle-row navigation to the cycle chart working", async () => {
    await logCycles(2);
    renderAt();

    const row = await screen.findByRole("row", { name: /Cycle 1/i });
    await userEvent.click(row);
    expect(await screen.findByText("cycle chart view")).toBeInTheDocument();
  });

  it("still navigates rows with the algorithm disabled, and the chart link stays", async () => {
    await logCycles(2);
    await store().updateSettings({ algorithmEnabled: false });
    renderAt();

    expect(await screen.findByTestId("history-instructor-chart")).toBeInTheDocument();
    const row = await screen.findByRole("row", { name: /Cycle 1/i });
    await userEvent.click(row);
    expect(await screen.findByText("cycle chart view")).toBeInTheDocument();
  });

  it("sits beside the compare link, not inside the cycle table", async () => {
    await logCycles(2);
    renderAt();
    const link = await screen.findByTestId("history-instructor-chart");
    const table = screen.getByRole("table");

    // Inside the table it would swallow row clicks; beside it, it cannot.
    expect(within(table).queryByTestId("history-instructor-chart")).not.toBeInTheDocument();
    expect(table.contains(link)).toBe(false);
  });
});
