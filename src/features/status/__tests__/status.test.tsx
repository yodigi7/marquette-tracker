import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays } from "@/core/engine/dateUtils";
import { todayKey } from "@/core/dateKeys";
import { useAppStore } from "@/core/store/useAppStore";
import { StatusView } from "../index";

const store = () => useAppStore.getState();

async function bootWithCycle() {
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().hydrate();
  await store().clearAllData();
  const cycle = await store().setNewCycle(todayKey());
  await store().addDayRecord(cycle.id, todayKey(), 1, { monitor: "high" });
}

beforeEach(async () => {
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().hydrate();
  await store().clearAllData();
});

afterEach(() => {
  cleanup();
});

describe("StatusView", () => {
  it("shows a date picker and derived status without daily-entry controls", async () => {
    await bootWithCycle();
    render(<StatusView />);

    expect(screen.getByTestId("date-trigger")).toBeInTheDocument();
    expect(screen.getByText(/cycle 1 · day 1/i)).toBeInTheDocument();
    expect(screen.getByText("Fertile")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /set day 1/i })).toBeNull();
    expect(screen.queryByText(/medical device|marquette-certified instructor/i)).toBeNull();
  });

  it("renders no medical disclaimer in either interpretation mode", async () => {
    // The status vocabulary carries the honesty claim, so the view must not
    // substitute a caveat for accurate wording. Nothing here may render a
    // disclaimer in place of that.
    const forbidden =
      /disclaimer|medical advice|not a substitute|consult (a|your|with)|medical device|marquette-certified instructor|seek (medical|professional)/i;

    await bootWithCycle();
    const { unmount } = render(<StatusView />);
    await screen.findByText("Fertile");
    expect(document.body.textContent ?? "").not.toMatch(forbidden);
    unmount();

    // The logging-only card is a Status rendering too, and must stay disclaimer-free.
    await store().updateSettings({ algorithmEnabled: false });
    render(<StatusView />);
    expect(await screen.findByText(/algorithm is off/i)).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(forbidden);
  });

  it("shows no status source badge", async () => {
    const cycle = await store().setNewCycle(addDays(todayKey(), -5));
    await store().addDayRecord(cycle.id, addDays(todayKey(), -5), 1, { bloodFlow: "medium" });

    render(<StatusView />);

    expect(screen.queryByText("predicted")).not.toBeInTheDocument();
    expect(screen.queryByText("confirmed")).not.toBeInTheDocument();
    expect(screen.getByText("Fertile")).toHaveClass("bg-fertility-status-fertile");
  });

  it("reports a status for a date inside the cycle that has no record", async () => {
    // Cycle day 8 today, so yesterday is day 7 — inside the day-6 window,
    // with nothing logged on it.
    const cycle = await store().setNewCycle(addDays(todayKey(), -7));
    await store().addDayRecord(cycle.id, addDays(todayKey(), -7), 1, { bloodFlow: "medium" });

    const user = userEvent.setup();
    render(<StatusView />);
    await user.click(screen.getByTestId("date-trigger"));
    const inWindow = new Date();
    inWindow.setDate(inWindow.getDate() - 1);
    const dayButton = await pickDayButton(user, inWindow.getDate());
    if (dayButton) await user.click(dayButton);

    expect(await screen.findByText("Fertile")).toBeInTheDocument();
    expect(cycle.id).toBeTruthy();
  });

  it("shows the window explanation and a next-period estimate when available", async () => {
    const previousStart = addDays(todayKey(), -60);
    const previous = await store().setNewCycle(previousStart);
    await store().addDayRecord(previous.id, previousStart, 1, { bloodFlow: "medium" });
    const currentStart = addDays(todayKey(), -30);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, addDays(currentStart, 2), 3, { monitor: "high" });

    render(<StatusView />);

    expect(screen.queryByText("confirmed")).not.toBeInTheDocument();
    expect(screen.getByText(/Fertile from cycle day/i)).toBeInTheDocument();
    expect(screen.getByText(/estimated next period:/i)).toBeInTheDocument();
  });

  it("can inspect a selected date without showing a start-cycle form", async () => {
    const user = userEvent.setup();
    await bootWithCycle();
    render(<StatusView />);

    await user.click(screen.getByTestId("date-trigger"));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayButton = await pickDayButton(user, yesterday.getDate());
    if (dayButton) await user.click(dayButton);

    expect(await screen.findByText(/no cycle/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /set day 1/i })).toBeNull();
  });

  it("explains logging-only mode when the algorithm is disabled", async () => {
    await bootWithCycle();
    await store().updateSettings({ algorithmEnabled: false });
    render(<StatusView />);

    expect(screen.getByText(/algorithm is off/i)).toBeInTheDocument();
    expect(screen.queryByText("Fertile")).toBeNull();
  });

  it("suppresses derived output while logging-only mode is active", async () => {
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: "peak" });
    await store().updateSettings({ algorithmEnabled: false });

    render(<StatusView />);

    // The toggle suppresses interpretation in the view; stored records remain.
    expect(store().dayRecords).toHaveLength(2);
    expect(screen.getByText(/algorithm is off/i)).toBeInTheDocument();
    expect(screen.queryByText("Fertile")).toBeNull();
  });

  it("describes the post-Peak rule with the fixed three-day interval", async () => {
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: "peak" });

    render(<StatusView />);
    expect(
      await screen.findByText(/until day 17 \(current monitor Peak \+ 3 days\)/),
    ).toBeInTheDocument();
  });

  it("renders no label asserting safety", async () => {
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: "peak" });
    // A day past the window end resolves post-window, which used to read "Safe".
    const past = addDays(start, 17);
    await store().addDayRecord(cycle.id, past, 18, { monitor: "low" });

    const { unmount } = render(<StatusView />);
    await screen.findByText(/until day 17/);
    expect(screen.queryByText(/safe/i)).toBeNull();
    unmount();
  });

  it("uses the shared status visual token with no source token", async () => {
    await bootWithCycle();
    render(<StatusView />);

    const statusBadge = screen.getByText("Fertile");
    expect(statusBadge.className).toContain("bg-fertility-status-fertile");
    expect(statusBadge.className).toContain("text-fertility-status-fertile-fg");
    expect(statusBadge.className).not.toContain("predicted");
  });

  it("marks the estimated next period as predictive and uses readable body text", async () => {
    const previousStart = addDays(todayKey(), -60);
    const previous = await store().setNewCycle(previousStart);
    await store().addDayRecord(previous.id, previousStart, 1, { bloodFlow: "medium" });
    const currentStart = addDays(todayKey(), -30);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, addDays(currentStart, 2), 3, { monitor: "high" });

    render(<StatusView />);

    expect(screen.getByTestId("status-forecast")).toHaveClass("text-fertility-forecast-fg");
    expect(screen.getByText(/Fertile from cycle day/i)).toHaveClass("text-fertility-body");
  });

  it("shows a no-cycle state on an empty store", () => {
    render(<StatusView />);

    expect(screen.getByText(/no cycle/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /set day 1/i })).toBeNull();
  });
});

async function pickDayButton(
  user: ReturnType<typeof userEvent.setup>,
  day: number,
): Promise<HTMLElement | null> {
  for (let tries = 0; tries < 4; tries++) {
    const cell = screen.queryByRole("gridcell", { name: String(day) });
    if (cell) {
      return cell.querySelector("button");
    }
    const previous = screen.queryByRole("button", { name: /previous month/i });
    if (!previous) return null;
    await user.click(previous);
  }
  return null;
}
