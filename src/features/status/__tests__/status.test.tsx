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

  it("warns when a monitor reading falls outside the computed window", async () => {
    // Peak on day 10 closes the window on day 13; a High on day 15 contradicts that.
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 9), 10, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 14), 15, { monitor: "high" });

    render(<StatusView />);

    const banner = await screen.findByTestId("status-warning");
    // Names the reading, the offending cycle day, and the computed window end.
    expect(banner).toHaveTextContent(/monitor reading outside the computed window/i);
    expect(banner).toHaveTextContent(/cycle day 15/i);
    expect(banner).toHaveTextContent(/ended on day 13/i);
    // The window itself is unchanged -- the warning reports, it does not move the end.
    expect(screen.getByText(/until day 13/)).toBeInTheDocument();
    expect(banner).not.toHaveTextContent(/invalid|error|malfunction/i);
  });

  it("shows the warning above the status badge", async () => {
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 9), 10, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 14), 15, { monitor: "high" });

    render(<StatusView />);

    const banner = await screen.findByTestId("status-warning");
    const badge = document.querySelector('[data-slot="badge"]');
    expect(badge).not.toBeNull();
    // Compare document order: the correction precedes the model claim it qualifies.
    expect(banner.compareDocumentPosition(badge!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the warning for a date earlier in the affected cycle, naming the offending day", async () => {
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 9), 10, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 14), 15, { monitor: "high" });

    render(<StatusView />);
    expect(await screen.findByTestId("status-warning")).toHaveTextContent(/cycle day 15/i);

    // Jump back to cycle day 3 -- well before the offending reading.
    const user = userEvent.setup();
    await user.click(screen.getByTestId("date-trigger"));
    const early = await pickDateButton(user, addDays(start, 2));
    expect(early).not.toBeNull();
    await user.click(early!);

    expect(screen.getByTestId("status-warning")).toHaveTextContent(/cycle day 15/i);
  });

  it("offers no dismiss control for a warning", async () => {
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 9), 10, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 14), 15, { monitor: "high" });

    render(<StatusView />);
    const banner = await screen.findByTestId("status-warning");

    expect(banner.querySelector("button")).toBeNull();
    expect(screen.queryByRole("button", { name: /dismiss|acknowledge|hide/i })).toBeNull();
  });

  it("suppresses the warning when interpretation is disabled", async () => {
    const start = addDays(todayKey(), -20);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 9), 10, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 14), 15, { monitor: "high" });

    await store().updateSettings({ algorithmEnabled: false });
    render(<StatusView />);

    expect(await screen.findByText(/algorithm is off/i)).toBeInTheDocument();
    expect(screen.queryByTestId("status-warning")).toBeNull();
  });

  it("shows no warning for an ordinary cycle", async () => {
    // A High on day 1 and a Peak on day 3: a real window, no contradiction, no run, and no absent end.
    const start = addDays(todayKey(), -4);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { monitor: "high" });
    await store().addDayRecord(cycle.id, addDays(start, 2), 3, { monitor: "peak" });

    render(<StatusView />);

    await screen.findByText("Fertile");
    expect(screen.queryByTestId("status-warning")).toBeNull();
  });

  it("warns that an unfinished cycle has run past its computed window", async () => {
    // Open cycle, Peak on day 10 (window ends day 13), today is cycle day 20.
    const start = addDays(todayKey(), -19);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, addDays(start, 9), 10, { monitor: "peak" });

    render(<StatusView />);

    const banner = await screen.findByTestId("status-warning");
    expect(banner).toHaveTextContent(/still in progress/i);
    expect(banner).toHaveTextContent(/ended on day 13/i);
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
    expect(dayButton).not.toBeNull();
    await user.click(dayButton!);

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
    expect(dayButton).not.toBeNull();
    await user.click(dayButton!);

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
      await screen.findByText(/until day 17 \(this cycle's monitor Peak \+ 3 days\)/),
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

/**
 * The two observations a cycle can raise without anything contradicting a computed window: no monitor
 * Peak to measure an end from, and a run of High readings long enough that the monitor's own guidance
 * is to stop testing. Both are ordinary outcomes, not faults, and both belong to the cycle rather than
 * to a date, so they show for any date in it.
 */
describe("StatusView: observations about the user's own readings", () => {
  const FORBIDDEN =
    /disclaimer|medical advice|not a substitute|consult (a|your|with)|medical device|marquette-certified instructor|seek (medical|professional)|invalid|error|malfunction/i;

  it("reports a cycle with no monitor Peak as unresolved", async () => {
    // Open cycle at cycle day 8, a High logged, no Peak: the protocol defines the end only through a
    // Peak, so this cycle has none and is not settled.
    const start = addDays(todayKey(), -7);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 5), 6, { monitor: "high" });

    render(<StatusView />);

    const banner = await screen.findByTestId("status-warning");
    expect(banner).toHaveTextContent(/no monitor Peak reading/i);
    expect(banner).toHaveTextContent(/unresolved/i);
    // Factual about the data, and nothing else: no referral, no disclaimer, no fault language.
    expect(document.body.textContent ?? "").not.toMatch(FORBIDDEN);
  });

  it("shows the missing-Peak notice for a date earlier in the cycle, with no dismiss control", async () => {
    const start = addDays(todayKey(), -7);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });

    render(<StatusView />);
    await screen.findByTestId("status-warning");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("date-trigger"));
    const earlier = await pickDateButton(user, addDays(start, 1));
    expect(earlier).not.toBeNull();
    await user.click(earlier!);

    const after = screen.getByTestId("status-warning");
    expect(after).toHaveTextContent(/no monitor Peak reading/i);
    expect(after.querySelector("button")).toBeNull();
  });

  it("reports a run of nine High readings with its length, and never as a Peak", async () => {
    // Nine consecutive Highs and no Peak: long enough that a Peak is no longer expected.
    const start = addDays(todayKey(), -11);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    for (let day = 4; day <= 12; day++) {
      await store().addDayRecord(cycle.id, addDays(start, day - 1), day, { monitor: "high" });
    }

    render(<StatusView />);

    const banner = await screen.findByTestId("status-warning");
    const text = banner.textContent ?? "";
    // Both observations are reported: a run of Highs is the reason this cycle has no Peak, so
    // reporting one without the other would leave a fact unexplained.
    expect(text).toMatch(/no monitor Peak reading/i);

    const runClause = text.slice(text.indexOf("A long run of High readings"));
    expect(runClause).toMatch(/\b9\b/);
    expect(runClause).toMatch(/stop testing/i);
    // The run is not a Peak reading, and the copy must not present it as one.
    expect(runClause).not.toMatch(/peak reading/i);
    expect(runClause).not.toMatch(FORBIDDEN);
    expect(text).not.toMatch(FORBIDDEN);
    // Nor does it become one: the cycle still has no Peak to measure an end from.
    expect(screen.getByTestId("status-peak-count")).toHaveTextContent(/no peak reading logged/i);
  });

  it("reports nothing for a run of eight High readings", async () => {
    const start = addDays(todayKey(), -12);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    for (let day = 4; day <= 11; day++) {
      await store().addDayRecord(cycle.id, addDays(start, day - 1), day, { monitor: "high" });
    }
    await store().addDayRecord(cycle.id, addDays(start, 11), 12, { monitor: "peak" });

    render(<StatusView />);

    // The Peak on day 12 ends the run at 8, and with a Peak on record there is no missing-end notice.
    await screen.findByText("Fertile");
    expect(screen.queryByTestId("status-warning")).toBeNull();
  });

  it("suppresses the missing-Peak notice when interpretation is disabled", async () => {
    const start = addDays(todayKey(), -7);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });

    await store().updateSettings({ algorithmEnabled: false });
    render(<StatusView />);

    expect(await screen.findByText(/algorithm is off/i)).toBeInTheDocument();
    expect(screen.queryByTestId("status-warning")).toBeNull();
  });
});

/**
 * Where the selected day sits relative to the Peak reading, and the Peak-day range derived from
 * past cycles. Both lines are retrospective: a count off the user's own readings, and a range read
 * off previous cycles. Neither may become a countdown, because a countdown is the one claim this
 * method is defined against.
 */
const COUNTDOWN =
  /\d+ days? (until|to|before)|until (your |the )?peak|days? to (your |the )?peak|next peak|coming peak|countdown|days? remaining/i;

describe("StatusView: days since the Peak reading", () => {
  it("counts the cycle days since the Peak and names the day it falls on", async () => {
    // Day 1 fifteen days back, so today is cycle day 15 and the Peak sits on day 12.
    const start = addDays(todayKey(), -14);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 11), 12, { monitor: "peak" });

    render(<StatusView />);

    expect(screen.getByText(/cycle 1 · day 15/i)).toBeInTheDocument();
    const line = await screen.findByTestId("status-peak-count");
    expect(line).toHaveTextContent(/3 days since your Peak reading on cycle day 12/);
  });

  it("does not move the count for days the user did not log", async () => {
    // Day 13 carries a Low and day 14 carries nothing. Both are cycle days, and the count is the
    // difference of two cycle days — so the gap is invisible to it and the answer is still 3.
    const start = addDays(todayKey(), -14);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 11), 12, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 12), 13, { monitor: "low" });

    render(<StatusView />);

    expect(await screen.findByTestId("status-peak-count")).toHaveTextContent(/^3 days/);
    expect(store().dayRecords.some((r) => r.dayInCycle === 14)).toBe(false);
  });

  it("shows an empty state and no number when no Peak reading is logged", async () => {
    const start = addDays(todayKey(), -14);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 7), 8, { monitor: "high" });

    render(<StatusView />);

    const line = await screen.findByTestId("status-peak-count");
    expect(line).toHaveTextContent(/no peak reading logged for this cycle yet/i);
    expect(line.textContent).not.toMatch(/\d/);
  });

  it("counts from the latest of several Peak readings and says how many there are", async () => {
    const start = addDays(todayKey(), -16);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 11), 12, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(start, 14), 15, { monitor: "peak" });

    render(<StatusView />);

    const line = await screen.findByTestId("status-peak-count");
    // Measured from day 15, not day 12 -- the same reading the window end is measured from.
    expect(line).toHaveTextContent(/2 days since your Peak reading on cycle day 15/);
    expect(line).toHaveTextContent(/last of 2 peak readings this cycle/i);
    expect(
      screen.getByText(/until day 18 \(this cycle's monitor Peak \+ 3 days\)/),
    ).toBeInTheDocument();
  });

  it("refuses to count elapsed days for a date that has not happened yet", async () => {
    // The picker has no future cut-off, so a user can select a date still to come. Counting to
    // it would assert that days have elapsed which have not: with a Peak on day 11 and today on
    // day 15, selecting day 20 must not read "9 days since".
    const start = addDays(todayKey(), -14);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 10), 11, { monitor: "peak" });

    const user = userEvent.setup();
    render(<StatusView />);
    // Today is cycle day 15, so the line counts normally before the date moves.
    expect(await screen.findByTestId("status-peak-count")).toHaveTextContent(/^4 days since/);

    await user.click(screen.getByTestId("date-trigger"));
    const later = await pickDateButton(user, addDays(todayKey(), 5));
    expect(later).not.toBeNull();
    await user.click(later!);

    expect(await screen.findByText(/cycle 1 · day 20/i)).toBeInTheDocument();
    const line = screen.getByTestId("status-peak-count");
    expect(line).toHaveTextContent(/cycle day 11/);
    expect(line).toHaveTextContent(/has not happened yet/i);
    expect(line.textContent).not.toMatch(/\d+ days? since/);
    expect(line.textContent).not.toMatch(COUNTDOWN);
  });

  it("names the Peak day and shows no count on a date before it", async () => {
    const start = addDays(todayKey(), -16);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, 14), 15, { monitor: "peak" });

    const user = userEvent.setup();
    render(<StatusView />);
    await user.click(screen.getByTestId("date-trigger"));
    // Cycle day 8, seven days after Day 1 and well before the day-15 Peak.
    const earlier = await pickDateButton(user, addDays(start, 7));
    expect(earlier).not.toBeNull();
    await user.click(earlier!);

    expect(await screen.findByText(/cycle 1 · day 8/i)).toBeInTheDocument();
    const line = await screen.findByTestId("status-peak-count");
    expect(line).toHaveTextContent(/cycle day 15/);
    expect(line).toHaveTextContent(/before it/i);
    // No negative count, and nothing pointing forward at the Peak.
    expect(line.textContent).not.toMatch(/-/);
    expect(line.textContent).not.toMatch(COUNTDOWN);
  });

  it("shows neither the count nor the range when interpretation is disabled", async () => {
    const previousStart = addDays(todayKey(), -60);
    const previous = await store().setNewCycle(previousStart);
    await store().addDayRecord(previous.id, addDays(previousStart, 13), 14, { monitor: "peak" });
    const currentStart = addDays(todayKey(), -30);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, addDays(currentStart, 13), 14, { monitor: "peak" });

    await store().updateSettings({ algorithmEnabled: false });
    render(<StatusView />);

    expect(await screen.findByText(/algorithm is off/i)).toBeInTheDocument();
    expect(screen.queryByTestId("status-peak-count")).toBeNull();
    expect(screen.queryByTestId("status-peak-range")).toBeNull();
  });
});

describe("StatusView: expected Peak-day range", () => {
  async function logClosedCycle(startOffset: number, cycleLength: number, peakDay: number) {
    const start = addDays(todayKey(), startOffset);
    const cycle = await store().setNewCycle(start);
    await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(start, peakDay - 1), peakDay, {
      monitor: "peak",
    });
    // Close it so it counts towards the history, by starting the next cycle after it.
    await store().setNewCycle(addDays(start, cycleLength));
    return cycle;
  }

  it("reports the range from past cycles and labels it as such", async () => {
    for (const [offset, length, peak] of [
      [-90, 28, 12],
      [-62, 28, 16],
      [-34, 28, 17],
    ] as const) {
      await logClosedCycle(offset, length, peak);
    }
    const currentStart = addDays(todayKey(), -6);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, currentStart, 1, { bloodFlow: "medium" });

    render(<StatusView />);

    const line = await screen.findByTestId("status-peak-range");
    expect(line).toHaveTextContent(/based on your last 3 completed cycles/i);
    expect(line).toHaveTextContent(/cycle day 12 to 17/);
    // A retrospective statement about history, never a forecast of one day.
    expect(line.textContent).not.toMatch(/predicted|confirmed|ovulation/i);
  });

  it("takes the range from the configured history window, not from every recorded cycle", async () => {
    // Nine closed cycles peaking in a rising run: only the most recent `historyWindow` of them
    // feed the calendar rule, so an all-cycles range would start at day 11 while the window the
    // same card describes begins at day 19 - 6.
    await store().updateSettings({ historyWindow: 3 });
    for (let index = 0; index < 9; index++) {
      const start = addDays(todayKey(), -(9 - index) * 30);
      const peak = 11 + index;
      const cycle = await store().setNewCycle(start);
      await store().addDayRecord(cycle.id, start, 1, { bloodFlow: "medium" });
      await store().addDayRecord(cycle.id, addDays(start, peak - 1), peak, { monitor: "peak" });
      await store().setNewCycle(addDays(start, 30));
    }
    const currentStart = addDays(todayKey(), -3);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, currentStart, 1, { bloodFlow: "medium" });

    render(<StatusView />);

    const line = await screen.findByTestId("status-peak-range");
    expect(line).toHaveTextContent(/cycle day 17 to 19/);
    expect(line.textContent).not.toContain("cycle day 11");
    // And it agrees with the window rule quoted on the same card.
    expect(screen.getByText(/earliest Peak − 6 days/)).toBeInTheDocument();
  });

  it("shows no range when no cycle in the window carries a Peak", async () => {
    const previousStart = addDays(todayKey(), -40);
    const previous = await store().setNewCycle(previousStart);
    await store().addDayRecord(previous.id, previousStart, 1, { bloodFlow: "medium" });
    await store().addDayRecord(previous.id, addDays(previousStart, 7), 8, { monitor: "high" });
    const currentStart = addDays(todayKey(), -10);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, currentStart, 1, { bloodFlow: "medium" });

    render(<StatusView />);

    await screen.findByTestId("status-peak-count");
    expect(screen.queryByTestId("status-peak-range")).toBeNull();
  });

  it("uses the existing body and muted text tokens, not a forecast treatment", async () => {
    const previousStart = addDays(todayKey(), -60);
    const previous = await store().setNewCycle(previousStart);
    await store().addDayRecord(previous.id, addDays(previousStart, 13), 14, { monitor: "peak" });
    const currentStart = addDays(todayKey(), -30);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, addDays(currentStart, 13), 14, { monitor: "peak" });

    render(<StatusView />);

    expect(await screen.findByTestId("status-peak-count")).toHaveClass("text-fertility-body");
    const range = screen.getByTestId("status-peak-range");
    expect(range).toHaveClass("text-fertility-muted");
    // The forecast token means "projected date" in this app; the range is not one.
    expect(range.className).not.toContain("fertility-forecast");
  });

  it("renders no countdown anywhere in the new lines", async () => {
    const previousStart = addDays(todayKey(), -60);
    const previous = await store().setNewCycle(previousStart);
    await store().addDayRecord(previous.id, addDays(previousStart, 13), 14, { monitor: "peak" });
    const currentStart = addDays(todayKey(), -30);
    const current = await store().setNewCycle(currentStart);
    await store().addDayRecord(current.id, addDays(currentStart, 13), 14, { monitor: "peak" });

    render(<StatusView />);

    const count = await screen.findByTestId("status-peak-count");
    const range = screen.getByTestId("status-peak-range");
    expect(count.textContent).not.toMatch(COUNTDOWN);
    expect(range.textContent).not.toMatch(COUNTDOWN);
    // And the whole card stays disclaimer-free and safety-free.
    expect(document.body.textContent ?? "").not.toMatch(COUNTDOWN);
  });
});

/**
 * Day button for an exact `YYYY-MM-DD` date. The picker can render the same day number in two
 * months at once, so a day-number query is ambiguous; `data-day` is not. The Calendar writes `data-day`
 * as the ISO key alongside a locale-formatted twin, so the ISO form is the one to match.
 */
async function pickDateButton(
  user: ReturnType<typeof userEvent.setup>,
  iso: string,
): Promise<HTMLElement | null> {
  const selector = `[data-day="${iso}"]`;

  for (let tries = 0; tries < 3; tries++) {
    const cell = document.querySelector(selector);
    if (cell) return cell.querySelector("button");
    const previous = screen.queryByRole("button", { name: /previous month/i });
    if (!previous) return null;
    await user.click(previous);
  }
  return null;
}

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
