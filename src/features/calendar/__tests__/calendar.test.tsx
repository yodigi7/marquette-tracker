import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays } from "@/core/engine/dateUtils";
import type { DayStatus } from "@/core/engine/types";
import { dateKeyLocal, parseDateKey, todayKey } from "@/core/dateKeys";
import { useAppStore } from "@/core/store/useAppStore";
import type { CalendarLayerId } from "@/core/store/entities";
import { Toaster } from "@/components/ui/sonner";
import { CalendarView } from "../index";
import { DayCell } from "../day-cell";
import type { DayCellProps } from "../day-cell";
import { windowEdgesByDay, type WindowEdges } from "../grid";
import { CALENDAR_LAYERS, LAYER_PAINT } from "../layers";
import { autoOpenStorageKey } from "../auto-open";

/**
 * The clock is pinned so this file cannot pass or fail on the day it runs.
 *
 * A great many tests here seed a cycle on the 1st of the current month and then log days 2, 3 and 4 of
 * it. That is only a past record while today is later in the month, so early in any month the seeding
 * throws `FutureDateError` and the test fails. Others depend on how much of the month is left for a
 * projected cycle to occupy. Neither is a property of the Calendar.
 *
 * Midday on the 15th: the seeded days are comfortably in the past, and there is still half a month of
 * future for the projection tests to work with. Only `Date` is faked, leaving real timers for
 * `userEvent`.
 */
const PINNED_NOW = new Date(2026, 5, 15, 12, 0, 0);

const store = () => useAppStore.getState();

function cellByDate(dateKey: string): HTMLElement | null {
  const cell = screen
    .getAllByTestId("day-cell")
    .find((el) => el.getAttribute("data-date") === dateKey);
  return cell ?? null;
}

async function bootCurrentMonth() {
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().hydrate();
  await useAppStore.getState().clearAllData();
}

function allowAutoOpen() {
  sessionStorage.removeItem(autoOpenStorageKey(todayKey()));
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(PINNED_NOW);
  await bootCurrentMonth();
  sessionStorage.setItem(autoOpenStorageKey(todayKey()), "consumed");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CalendarView", () => {
  it("navigates months and resets to the current month", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    const current = monthTitleFor(parseDateKey(todayKey()));
    await user.click(screen.getByRole("button", { name: /next month/i }));
    expect(await screen.findByText(shiftedMonth(current, 1))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /today/i }));
    expect(await screen.findByText(current)).toBeInTheDocument();
  });

  it("shows the current cycle, day, phase, and monitor reading in the summary", async () => {
    const today = todayKey();
    const cycleStart = addDays(today, -5);
    const cycle = await store().setNewCycle(cycleStart);
    await store().addDayRecord(cycle.id, today, 6, { monitor: "high" });

    render(<CalendarView />);

    const summary = await screen.findByTestId("calendar-summary");
    expect(summary).toHaveTextContent("Cycle 1");
    expect(summary).toHaveTextContent("Day 6");
    expect(summary).toHaveTextContent("Fertile");
    expect(summary).toHaveTextContent("High");
  });

  it("keeps the summary visible with a no-reading state when today has no monitor value", async () => {
    await store().setNewCycle(todayKey());

    render(<CalendarView />);

    const summary = await screen.findByTestId("calendar-summary");
    expect(summary).toHaveTextContent("Cycle 1");
    expect(summary).toHaveTextContent("No monitor logged");
  });

  it("shows a logging-only summary when interpretation is disabled", async () => {
    const today = todayKey();
    const cycle = await store().setNewCycle(addDays(today, -5));
    await store().addDayRecord(cycle.id, today, 6, { monitor: "high" });
    await store().updateSettings({ algorithmEnabled: false });

    render(<CalendarView />);

    const summary = await screen.findByTestId("calendar-summary");
    expect(summary).toHaveTextContent("Logging only");
    expect(summary).not.toHaveTextContent("Fertile");
  });

  it("shows a no-cycle summary before any cycle is derived", async () => {
    render(<CalendarView />);

    const summary = await screen.findByTestId("calendar-summary");
    expect(summary).toHaveTextContent("No cycle yet");
  });

  it("auto-opens today when there is no record or Peak and the session has not consumed it", async () => {
    allowAutoOpen();
    const cycleStart = addDays(todayKey(), -5);
    const cycle = await store().setNewCycle(cycleStart);
    await store().addDayRecord(cycle.id, cycleStart, 1, { bloodFlow: "medium" });

    render(<CalendarView />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Day details")).toBeInTheDocument();
    expect(sessionStorage.getItem(autoOpenStorageKey(todayKey()))).not.toBeNull();
  });

  it("does not auto-open when today already has a record", async () => {
    const cycle = await store().setNewCycle(todayKey());
    await store().addDayRecord(cycle.id, todayKey(), 1, { monitor: "low" });
    allowAutoOpen();

    render(<CalendarView />);
    await screen.findAllByTestId("day-cell");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not auto-open when the current cycle has a monitor Peak", async () => {
    const cycleStart = addDays(todayKey(), -5);
    const cycle = await store().setNewCycle(cycleStart);
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { monitor: "peak" });
    allowAutoOpen();

    render(<CalendarView />);
    await screen.findAllByTestId("day-cell");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not auto-open when the current cycle has a monitor Peak after a mucus Peak", async () => {
    const cycleStart = addDays(todayKey(), -6);
    const cycle = await store().setNewCycle(cycleStart);
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(cycleStart, 3), 4, { mucus: "peak" });
    allowAutoOpen();

    render(<CalendarView />);
    await screen.findAllByTestId("day-cell");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("auto-opens when the current cycle has a mucus Peak but no monitor Peak", async () => {
    const cycleStart = addDays(todayKey(), -6);
    const cycle = await store().setNewCycle(cycleStart);
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { mucus: "peak" });
    allowAutoOpen();

    render(<CalendarView />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("does not auto-open with consecutive monitor Peaks", async () => {
    const cycleStart = addDays(todayKey(), -6);
    const cycle = await store().setNewCycle(cycleStart);
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(cycleStart, 3), 4, { monitor: "peak" });
    allowAutoOpen();

    render(<CalendarView />);
    await screen.findAllByTestId("day-cell");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not auto-open again after the date was consumed in this session", async () => {
    const cycleStart = addDays(todayKey(), -5);
    const cycle = await store().setNewCycle(cycleStart);
    await store().addDayRecord(cycle.id, cycleStart, 1, { bloodFlow: "medium" });
    sessionStorage.setItem(autoOpenStorageKey(todayKey()), "consumed");

    render(<CalendarView />);
    await screen.findAllByTestId("day-cell");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("auto-opens today when no cycle has been derived yet", async () => {
    allowAutoOpen();
    render(<CalendarView />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("shows status bands, menses and monitor dots for a seeded cycle", async () => {
    const now = new Date();
    const day1Key = dateKeyLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, day1Key, 1, { bloodFlow: "medium" });
    const day3Key = addDays(day1Key, 2);
    await store().addDayRecord(id, day3Key, 3, { monitor: "high" });

    render(<CalendarView />);

    const day1 = cellByDate(day1Key);
    expect(day1?.getAttribute("data-status")).toBe("pre-fertile");
    expect(day1?.getAttribute("data-source")).toBeNull();
    expect(day1?.querySelector('[title="Menses"]')).not.toBeNull();

    const day3 = cellByDate(day3Key);
    expect(day3?.getAttribute("data-status")).toBe("fertile");
    expect(day3?.getAttribute("data-source")).toBeNull();
    expect(day3?.querySelector('[title="Monitor: high"]')).not.toBeNull();

    // An unlogged day inside the window is painted from the rules alone.
    const day2 = cellByDate(addDays(day1Key, 1));
    expect(day2?.getAttribute("data-status")).toBe("pre-fertile");
    expect(day2?.querySelector('[title="Monitor: high"]')).toBeNull();
  });

  it("shows a small filled red heart for recorded intercourse", async () => {
    const now = new Date();
    const day1Key = dateKeyLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const intercourseKey = addDays(day1Key, 2);
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, intercourseKey, 3, { intercourse: true });
    await store().updateSettings({ calendarDetailMode: "full" });

    render(<CalendarView />);

    const dayMarker = cellByDate(intercourseKey)?.querySelector('[title="Intercourse"]');
    expect(dayMarker?.querySelector("svg")).toHaveClass(
      "size-2",
      "fill-fertility-marker-intercourse",
      "text-fertility-marker-intercourse",
    );
    expect(screen.getByText("Intercourse").querySelector("svg")).toHaveClass(
      "size-2",
      "fill-fertility-marker-intercourse",
      "text-fertility-marker-intercourse",
    );
    expect(cellByDate(day1Key)?.querySelector('[title="Intercourse"]')).toBeNull();
  });

  it("opens a blank entry form for an uncovered past date and saves it", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    const past = dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
    await user.click(cellByDate(past)!);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/re-derives cycle structure/i)).toBeInTheDocument();
    expect(screen.queryByTestId("delete-record")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(store().dayRecords).toHaveLength(1));
    expect(store().cycles).toHaveLength(1);
    expect(store().dayRecords[0].date).toBe(past);
  });

  it("pre-populates a covered date that already has a record", async () => {
    const user = userEvent.setup();
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, day1Key, 1, { monitor: "peak" });

    render(<CalendarView />);
    await user.click(cellByDate(day1Key)!);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("delete-record")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Peak" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens the day dialog without computed status, source, or forecast text", async () => {
    const user = userEvent.setup();
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, day1Key, 1, { monitor: "peak" });
    await store().addDayRecord(id, addDays(day1Key, 13), 14, { monitor: "high" });

    render(<CalendarView />);
    await user.click(cellByDate(addDays(day1Key, 13))!);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("Status:");
    expect(dialog).not.toHaveTextContent("(confirmed)");
    expect(dialog).not.toHaveTextContent("(predicted)");
    expect(dialog).not.toHaveTextContent("post-peak");
  });

  it("keeps the day dialog free of derived status while the algorithm is off", async () => {
    const user = userEvent.setup();
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, day1Key, 1, { monitor: "peak" });
    await store().updateSettings({ algorithmEnabled: false });

    render(<CalendarView />);
    await user.click(cellByDate(day1Key)!);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toHaveTextContent("Status:");
    expect(dialog).not.toHaveTextContent("(confirmed)");
    expect(screen.getByTestId("delete-record")).toBeInTheDocument();
  });

  it("keeps existing values when a pre-populated form is saved", async () => {
    const user = userEvent.setup();
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, day1Key, 1, { monitor: "high", bloodFlow: "medium" });

    render(<CalendarView />);
    await user.click(cellByDate(day1Key)!);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "High" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("bloodflow")).toHaveTextContent("Medium");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(store().dayRecords).toHaveLength(1);
    expect(store().dayRecords[0].monitor).toBe("high");
    expect(store().dayRecords[0].bloodFlow).toBe("medium");
  });

  it("applies an edit made in a pre-populated form", async () => {
    const user = userEvent.setup();
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, day1Key, 1, { monitor: "high", bloodFlow: "medium" });

    render(<CalendarView />);
    await user.click(cellByDate(day1Key)!);
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Peak" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(store().dayRecords[0].monitor).toBe("peak"));
    expect(store().dayRecords[0].bloodFlow).toBe("medium");
  });

  it("rejects a future date with a message and writes nothing", async () => {
    const user = userEvent.setup();
    stubMatchMedia();
    render(
      <>
        <CalendarView />
        <Toaster />
      </>,
    );

    await user.click(screen.getByRole("button", { name: /next month/i }));
    const future = firstDayOfNextMonth();
    await user.click(cellByDate(future)!);

    expect(await screen.findByText(/future dates cannot be logged/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(store().dayRecords).toHaveLength(0);
  });

  it("opening and closing without saving creates nothing", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    const past = dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
    await user.click(cellByDate(past)!);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(store().dayRecords).toHaveLength(0);
    expect(store().cycles).toHaveLength(0);
  });

  it("marks calendar-range and first-High-range cells with distinct sources", async () => {
    const now = new Date();
    const day1Key = dateKeyLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const highKey = addDays(day1Key, 3);
    const { id } = await store().setNewCycle(day1Key);
    await store().addDayRecord(id, addDays(day1Key, 2), 3, {});
    await store().addDayRecord(id, highKey, 4, { monitor: "high" });

    render(<CalendarView />);

    const beforeHigh = cellByDate(addDays(day1Key, 2));
    expect(beforeHigh?.getAttribute("data-status")).toBe("pre-fertile");

    const firstHighDay = cellByDate(highKey);
    expect(firstHighDay?.getAttribute("data-status")).toBe("fertile");
  });

  it("uses shared tokenized treatments for all four statuses", () => {
    // The Calendar collapses post-peak and post-calendar into the `after`
    // phase, which deliberately reuses the post-peak treatment.
    const cases = [
      { status: "pre-fertile" as const, fill: "bg-fertility-status-pre" },
      { status: "fertile" as const, fill: "bg-fertility-status-fertile" },
      { status: "post-peak" as const, fill: "bg-fertility-status-post-peak" },
      { status: "post-calendar" as const, fill: "bg-fertility-status-post-peak" },
    ];

    for (const testCase of cases) {
      const { unmount } = render(
        <DayCell
          dateKey="2026-01-01"
          dayNumber={1}
          info={testCase.status}
          forecast={false}
          menses={false}
          monitor={undefined}
          intercourse={false}
          isToday={false}
          detailMode="full"
          onSelect={() => {}}
        />,
      );
      const cell = screen.getByTestId("day-cell");
      expect(cell.className).toContain(testCase.fill);
      expect(cell.getAttribute("data-status")).toBe(testCase.status);
      // No evidence-source cue is rendered.
      expect(cell.getAttribute("data-source")).toBeNull();
      unmount();
    }
  });

  /** The class of the run outline: the cue a predicted day inside the window carries. */
  function outlineClasses(): string {
    return screen.queryByTestId("calendar-run-outline")?.className ?? "";
  }

  describe("the window bar and the phase band", () => {
    const band = '[data-testid="calendar-phase-band"]';
    const bar = '[data-testid="calendar-window-bar"]';

    /**
     * A cell rendering one phase, with the window edges the Calendar would have supplied.
     *
     * Returns the raw `render()` handle, so read it with `container`/`screen`. The other helper in
     * this file — `renderCell` — is the mirror image: it takes overrides and returns
     * `{ cell, unmount }`.
     */
    function renderPhaseCell(info: DayStatus | null, extra: Partial<DayCellProps> = {}) {
      return render(
        <DayCell
          dateKey="2026-01-14"
          dayNumber={14}
          info={info}
          forecast={false}
          menses={false}
          monitor={undefined}
          intercourse={false}
          isToday={false}
          onSelect={() => {}}
          {...extra}
        />,
      );
    }

    function barClasses(info: DayStatus | null, edges?: WindowEdges): string {
      const { container } = renderPhaseCell(info, edges ? { windowEdges: edges } : {});
      return container.querySelector(bar)?.className ?? "";
    }

    /**
     * The window's first day, in a column the run does not carry on from. Nothing continues up, so its
     * top-left corner is free; nothing continues down, so its bottom-left one is too.
     */
    const FIRST_DAY: WindowEdges = {
      start: true,
      end: false,
      continuesUp: false,
      continuesDown: false,
      roundStart: true,
      roundEnd: false,
    };
    /** The window's last day, likewise with nothing carrying on past it. */
    const LAST_DAY: WindowEdges = {
      start: false,
      end: true,
      continuesUp: false,
      continuesDown: false,
      roundStart: false,
      roundEnd: true,
    };
    /** A day in the middle of a run that spans three rows. */
    const INTERIOR: WindowEdges = {
      start: false,
      end: false,
      continuesUp: true,
      continuesDown: true,
      roundStart: false,
      roundEnd: false,
    };
    /** The last day of a row whose window carries on in the next row. */
    const ROW_END_CONTINUES: WindowEdges = {
      start: false,
      end: true,
      continuesUp: true,
      continuesDown: true,
      roundStart: false,
      roundEnd: false,
    };
    /** The first day of a row the window carried into from the row above. */
    const ROW_START_CONTINUED: WindowEdges = {
      start: true,
      end: false,
      continuesUp: true,
      continuesDown: true,
      roundStart: false,
      roundEnd: false,
    };
    /** A one-day window: the same day is both ends. */
    const ALONE: WindowEdges = {
      start: true,
      end: true,
      continuesUp: false,
      continuesDown: false,
      roundStart: true,
      roundEnd: true,
    };

    it.each([
      ["pre-fertile" as const, "bg-fertility-status-pre"],
      ["post-peak" as const, "bg-fertility-status-post-peak"],
      // `post-calendar` collapses into the `after` phase on a Calendar, so it wears the post-peak tint.
      // The Status view is where it is distinguished, and it has its own fill token for that.
      ["post-calendar" as const, "bg-fertility-status-post-peak"],
    ])("paints a %s day as a tint and nothing else", (info, cls) => {
      // The two quiet phases are tints, and they were tints before this change. What is new is that they
      // stay that way while the window becomes the loudest thing on the calendar, so all three phases
      // are still on screen and none of them is dropped to make room for the window.
      const { container } = renderPhaseCell(info);
      expect(screen.getByTestId("day-cell").className).toContain(cls);
      expect(container.querySelector(bar), "a tint is not a bar").toBeNull();
    });

    it("draws no horizontal line along any day's top edge", () => {
      // The withdrawn version of this change put a 4px band on every phase. It fixed the reported
      // problem and it is the reason a second report arrived: the band and the menses stripe are both
      // horizontal lines at opposite cell edges, 8px apart across a week boundary, where they read as a
      // single mark. Nothing on a day cell draws one now, on any phase.
      for (const info of ["pre-fertile", "fertile", "post-peak", "post-calendar"] as const) {
        const { container, unmount } = renderPhaseCell(info, { windowEdges: FIRST_DAY });
        expect(
          container.querySelector('[data-testid="calendar-phase-band"]'),
          `${info} must not paint a band`,
        ).toBeNull();
        unmount();
      }
    });

    it("paints nothing but the tint on a day with no phase", () => {
      const { container } = renderPhaseCell(null);
      expect(container.querySelector(bar)).toBeNull();
      expect(container.querySelector(band)).toBeNull();
    });

    it("draws the window as a solid bar at full cell height, and gives it no band", () => {
      // A band and the menses stripe are both horizontal lines at opposite cell edges, 8px apart
      // across a week boundary, where they read as one mark. A band on the window would put that mark
      // back, so the window is a bar instead.
      const { container } = renderPhaseCell("fertile", { windowEdges: FIRST_DAY });
      expect(container.querySelector(band)).toBeNull();
      expect(container.querySelector(bar)?.className).toContain(
        "bg-fertility-status-fertile-window",
      );
    });

    it("carries its own fill rather than relying on the cell's tint behind it", () => {
      // The bar is the shape, and it spans the whole cell, so it has to be visible as a surface in its
      // own right. Relying on the cell's darker tint and drawing a wire around it is what made an
      // earlier attempt read as a box.
      const className = barClasses("fertile", FIRST_DAY);
      expect(className).toContain("bg-fertility-status-fertile-window");
      expect(className, "a solid bar, not a wire").not.toContain("border-2");
    });

    it("leaves nothing behind a rounded end but the window's own colour", () => {
      // A rounded corner cannot paint itself, so whatever is behind the bar's radius shows through. With
      // the cell's darker status tint behind it, each end of the window grew a notch of that tint, which
      // read as a leftover of the old treatment. The cell behind the bar has to be the window's colour.
      const { container } = renderPhaseCell("fertile", { windowEdges: FIRST_DAY });
      const cells = screen.getByTestId("day-cell").classList;
      expect(cells.contains("bg-fertility-status-fertile-window"), "the cell is the window").toBe(
        true,
      );
      expect(
        cells.contains("bg-fertility-status-fertile"),
        "and not the darker status tint, which is what showed through the rounded corner",
      ).toBe(false);
      expect(container.querySelector(bar)?.className).toContain(
        "bg-fertility-status-fertile-window",
      );
    });

    it("paints nothing between two adjacent window days in the same row", () => {
      // The comb. The bar has to span the grid gap sideways, or every pair of adjacent window days is
      // separated by a stripe of page showing through and a run of eleven days reads as a row of tiles
      // rather than one shape. The gap is 4px and the bar overhangs by exactly that.
      expect(barClasses("fertile", INTERIOR), "continues both ways").toContain("-left-1");
      expect(barClasses("fertile", INTERIOR)).toContain("-right-1");
      expect(
        barClasses("fertile", ROW_END_CONTINUES),
        "closes its row but still continues to its left",
      ).toContain("-left-1");
    });

    it.each([
      ["the window's first day", FIRST_DAY, "left-0", "-right-1"],
      // A day that opens a row continues to its right even though nothing continues to its left, and a
      // day that closes a row continues to its left even though nothing continues to its right. Deciding
      // both sides from one flag put a 4px tab of window colour outside the calendar's first and last
      // columns, and left a 4px gap inside the run immediately after the day that opened it.
      ["a row opening mid-window", ROW_START_CONTINUED, "left-0", "-right-1"],
      ["a row closing mid-window", ROW_END_CONTINUES, "-left-1", "right-0"],
      ["the window's last day", LAST_DAY, "-left-1", "right-0"],
      ["a one-day window", ALONE, "left-0", "right-0"],
    ] as const)("bleeds %s sideways only where the run continues", (_l, edges, left, right) => {
      const className = barClasses("fertile", edges);
      expect(className, `expected ${left}`).toContain(left);
      expect(className, `expected ${right}`).toContain(right);
    });

    it("never bleeds vertically, so the calendar's rows stay legible inside the window", () => {
      // The row gap is the only cue that tells you which week you are looking at, and a bar that filled
      // it dissolved the row structure inside the window. A run that wraps weeks is two bars with the
      // calendar's own gap between them, and the bar's height is the cell's height exactly.
      for (const [label, edges] of [
        ["an interior day", INTERIOR],
        ["the window's first day", FIRST_DAY],
        ["a row the run continues past", ROW_END_CONTINUES],
        ["a row the run continued into", ROW_START_CONTINUED],
      ] as const) {
        const className = barClasses("fertile", edges);
        expect(className, `${label} must not bleed up`).not.toContain("-top-1");
        expect(className, `${label} must not bleed down`).not.toContain("-bottom-1");
        expect(className, `${label} fills exactly the cell's height`).toContain("top-0");
        expect(className, `${label} fills exactly the cell's height`).toContain("bottom-0");
      }
    });

    it.each([
      ["the window's first day", FIRST_DAY, "rounded-l-md", "rounded-r-md"],
      ["the window's last day", LAST_DAY, "rounded-r-md", "rounded-l-md"],
      // A one-day window is both of its ends, so it is rounded at both of them.
      ["a one-day window", ALONE, "rounded-l-md", null],
      // Everything else stays square. Rounding a row that merely opens or closes inside the window
      // would present a week boundary as the window's boundary.
      ["a day the run merely continues past", INTERIOR, null, "rounded-l-md"],
      ["a row opening mid-window", ROW_START_CONTINUED, null, "rounded-l-md"],
      ["a row closing mid-window", ROW_END_CONTINUES, null, "rounded-r-md"],
    ] as const)("rounds %s", (_l, edges, has, lacks) => {
      // The bar rounds to the CELL's radius, not to a larger one of its own: the cell's background
      // sits behind the bar, and a sharper corner on the cell than on the bar fills the space the
      // bar curves out of, reaching past whatever is drawn beyond it.
      const className = barClasses("fertile", edges);
      if (has) expect(className, `expected ${has}`).toContain(has);
      else expect(className, "expected no rounding at all").not.toContain("rounded-l-md");
      if (lacks) expect(className, `expected no ${lacks}`).not.toContain(lacks);
    });

    it("is not clipped by the cell, so the bar can reach across the grid gap", () => {
      renderPhaseCell("fertile", { windowEdges: FIRST_DAY });
      expect(screen.getByTestId("day-cell").className).not.toContain("overflow-hidden");
      expect(barClasses("fertile", FIRST_DAY)).not.toContain("overflow");
    });

    describe("the run outline on a predicted day inside the window", () => {
      /**
       * A border on the cell is what broke this in the first place: the bar is positioned against
       * the padding box, and a border shrinks it, so a bordered window day drew its bar 2px short
       * and 2px narrow with the border crossing its bottom edge. These pin that the cue has moved
       * off the cell, because that is the whole fix.
       */
      it("marks a predicted window day with an outline, never a border on the cell", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: FIRST_DAY });
        expect(screen.getByTestId("day-cell").className).not.toContain(
          "border-fertility-forecast-border",
        );
        expect(outlineClasses()).toContain("border-dashed border-fertility-forecast-border");
      });

      it("keeps the plain border on a predicted day outside the window", () => {
        renderPhaseCell("post-peak", { forecast: true });
        expect(screen.getByTestId("day-cell").className).toContain(
          "border-fertility-forecast-border",
        );
        expect(screen.queryByTestId("calendar-run-outline")).toBeNull();
      });

      it("keeps a dashed cue on a predicted window day whose fertile layer is hidden", () => {
        // Hiding the Fertile layer takes the bar away, so there is no run left to draw an outline
        // around. The day still has to read as predicted: a Predicted day is the one layer that
        // carries a border as well as a fill, which is what separates it from a plain phase cell
        // without relying on colour.
        renderPhaseCell("fertile", {
          forecast: true,
          windowEdges: INTERIOR,
          hiddenLayers: ["fertile"],
        });
        expect(screen.queryByTestId("calendar-window-bar")).toBeNull();
        expect(screen.queryByTestId("calendar-run-outline")).toBeNull();
        expect(screen.getByTestId("day-cell").className).toContain(
          "border-fertility-forecast-border",
        );
      });

      it("leaves the interior of a run free of dashes", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: INTERIOR });
        const classes = outlineClasses();
        expect(classes).not.toContain("border-l");
        expect(classes).not.toContain("border-r");
        expect(classes).toContain("border-t");
        expect(classes).toContain("border-b");
      });

      it("caps the run where it starts within its row", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: ROW_START_CONTINUED });
        expect(outlineClasses()).toContain("border-l");
        expect(outlineClasses()).not.toContain("border-r");
      });

      it("caps the run where it ends within its row", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: ROW_END_CONTINUES });
        expect(outlineClasses()).toContain("border-r");
        expect(outlineClasses()).not.toContain("border-l");
      });

      it("draws the leading edge where the predicting begins", () => {
        // The window runs on from days that happened into days that haven't. Without this the dashes
        // simply stop being at Oct 15 and nothing says that day is the first guess rather than the
        // hundredth record.
        renderPhaseCell("fertile", { forecast: true, windowEdges: INTERIOR, beginsForecast: true });
        expect(outlineClasses()).toContain("border-l");
      });

      it("outsets from the bar's box, not the cell's", () => {
        // The bar bleeds 4px into the grid gap wherever the run continues. Measured from the cell the
        // dashes fell short of the bar, and their corner arcs were measured from a different origin.
        renderPhaseCell("fertile", { forecast: true, windowEdges: INTERIOR });
        expect(outlineClasses()).toContain("-left-[6px]");
        expect(outlineClasses()).toContain("-right-[6px]");
      });

      it("sets the outline 2px further out where the run ends", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: ROW_END_CONTINUES });
        expect(outlineClasses()).toContain("-right-[2px]");
      });

      it("rounds the outline to the cell's corner so the fill stays inside it", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: FIRST_DAY });
        const bar = barClasses("fertile", FIRST_DAY);
        expect(bar).toContain("rounded-l-md");
        expect(outlineClasses()).toContain("rounded-l-[10px]");
      });

      it("is dropped when the predictive layer is hidden", () => {
        renderPhaseCell("fertile", {
          forecast: true,
          windowEdges: FIRST_DAY,
          hiddenLayers: ["predicted"],
        });
        expect(screen.queryByTestId("calendar-run-outline")).toBeNull();
      });

      it("starts at the day boundary, not out where the bar is", () => {
        // Today's ring reaches 2px into the grid gap on this side. A line 2px outside the bar would be
        // drawn across the recorded day beside it, hard against the ring, and the two marks would read
        // as one thick band. The predicted run starts at the boundary instead.
        renderPhaseCell("fertile", { forecast: true, windowEdges: INTERIOR, beginsForecast: true });
        expect(outlineClasses()).toContain("-left-0");
        expect(outlineClasses()).not.toContain("-left-[6px]");
      });

      it("keeps a window that genuinely started on the day outset of the bar", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: FIRST_DAY });
        expect(outlineClasses()).toContain("-left-[2px]");
      });

      it("keeps the run's inner days outset of the bar", () => {
        renderPhaseCell("fertile", { forecast: true, windowEdges: INTERIOR });
        expect(outlineClasses()).toContain("-left-[6px]");
      });
    });

    describe("the today ring", () => {
      const ring = '[data-testid="calendar-today-ring"]';
      const cell = () => screen.getByTestId("day-cell");

      it("is drawn as an element after the bar, not as a shadow on the cell", () => {
        // A box-shadow paints under every child, and the bar bleeds past the cell on both sides, so on
        // a day inside the window the bar covered the ring's left and right strokes outright.
        renderPhaseCell("fertile", { isToday: true, windowEdges: INTERIOR });
        const el = cell().querySelector(ring);
        const barEl = cell().querySelector(bar);
        expect(el).not.toBeNull();
        expect(barEl!.compareDocumentPosition(el!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(cell().className).not.toContain("ring-2 ring-foreground");
      });

      it("lifts the cell, so the next day's bar cannot paint over it", () => {
        // The next day's cell comes later in the document and its bar reaches back across the grid gap
        // over this cell's right-hand ring stroke. Document order cannot protect an outset ring.
        renderPhaseCell("fertile", { isToday: true });
        expect(cell().className).toContain("z-10");
      });

      it("does not lift any other day", () => {
        renderPhaseCell("fertile");
        expect(cell().className).not.toContain("z-10");
        expect(cell().querySelector(ring)).toBeNull();
      });

      it("outsets the same 2px on a day with no bar as on one inside the window", () => {
        // The ring must not change shape between window and non-window days, or today would read as
        // two different things depending on what the app thinks is going on.
        const inside = renderPhaseCell("fertile", { isToday: true, windowEdges: INTERIOR });
        const insideClass = inside.container.querySelector(ring)!.className;
        inside.unmount();

        const outside = renderPhaseCell(null, { isToday: true });
        expect(outside.container.querySelector(ring)!.className).toBe(insideClass);
      });
    });

    it.each(["pre-fertile", "post-peak", "post-calendar"] as const)(
      "never draws a window bar on a %s day, even if edges were supplied",
      (info) => {
        // Only a fertile day is part of a run. A bar on another phase would be advertising a window
        // the cell is not painting.
        const { container } = renderPhaseCell(info, { windowEdges: FIRST_DAY });
        expect(container.querySelector(bar)).toBeNull();
      },
    );

    it("paints no bar on a day with no phase", () => {
      const { container } = renderPhaseCell(null, { windowEdges: FIRST_DAY });
      expect(container.querySelector(bar)).toBeNull();
    });

    it("paints no bar on a projected day that has no phase", () => {
      const { container } = renderPhaseCell(null, { forecast: true });
      expect(container.querySelector(bar)).toBeNull();
      expect(screen.getByTestId("day-cell").className).toContain("bg-fertility-forecast-bg");
    });

    it("draws a bar on a projected fertile day, so a forecast window is the same kind of shape", () => {
      const { container } = renderPhaseCell("fertile", { forecast: true, windowEdges: FIRST_DAY });
      expect(container.querySelector(bar)).not.toBeNull();
    });

    it("draws no separate mark beside the bar, so nothing reads as a stray dot", () => {
      // An earlier attempt drew a stub below the band's edge in the band's own colour. It was the same
      // colour as the band and therefore invisible, and at true size it read as a floating period.
      const { container } = renderPhaseCell("fertile", { windowEdges: FIRST_DAY });
      expect(container.querySelectorAll('[data-testid="calendar-run-edge"]')).toHaveLength(0);
      expect(container.querySelectorAll(bar)).toHaveLength(1);
    });

    it("keeps the bar, the menses stripe, and the monitor marker on the same day", () => {
      // Menses days and window days never overlap in the protocol, but the positioning still has to
      // coexist rather than one layer covering another.
      const { container } = renderPhaseCell("fertile", {
        windowEdges: INTERIOR,
        menses: true,
        monitor: "high",
      });
      const cell = screen.getByTestId("day-cell");
      expect(container.querySelector(bar)).not.toBeNull();
      expect(cell.querySelector('[data-testid="calendar-menses-stripe"]')).not.toBeNull();
      expect(cell.querySelector('[data-testid="calendar-monitor-marker"]')?.className).toContain(
        "bg-fertility-monitor-high",
      );
    });

    it("paints neither band nor bar when the phase layer is hidden, and keeps the label", () => {
      const { container } = renderPhaseCell("fertile", {
        windowEdges: FIRST_DAY,
        hiddenLayers: ["fertile" as never],
      });
      expect(container.querySelector(bar)).toBeNull();
      expect(container.querySelector(band)).toBeNull();
      expect(screen.getByTestId("day-cell").getAttribute("aria-label")).toContain("Fertile");
    });

    it("renders no bar and no band anywhere when the algorithm is disabled", async () => {
      const cycle = await store().setNewCycle(addDays(todayKey(), -5));
      await store().addDayRecord(cycle.id, addDays(todayKey(), -5), 1, { bloodFlow: "medium" });
      await store().addDayRecord(cycle.id, addDays(todayKey(), -3), 3, { monitor: "high" });
      await store().updateSettings({ algorithmEnabled: false });

      render(<CalendarView />);
      await waitFor(() => expect(screen.getAllByTestId("day-cell").length).toBeGreaterThan(0));
      expect(document.querySelectorAll('[data-testid="calendar-window-bar"]')).toHaveLength(0);
      expect(document.querySelectorAll('[data-testid="calendar-phase-band"]')).toHaveLength(0);
    });

    it("paints one bar across a window that wraps weeks, with no seam between the rows", () => {
      // The seam defect, end to end: a window of days 6-16 in a 7-wide month renders on three rows,
      // and the bar has to be continuous down every column it passes through.
      const slots = Array.from({ length: 21 }, (_, i) => ({
        dateKey: `2026-09-${String(i + 1).padStart(2, "0")}`,
        inWindow: i + 1 >= 6 && i + 1 <= 16,
        row: Math.floor(i / 7),
        column: i % 7,
      }));
      const edges = windowEdgesByDay(slots, "2026-09-16");
      // Day 7 ends its row in column 6 and the run carries on below it, so it must not close the row
      // with a bottom edge; day 8 opens a new row in column 0, so it must not grow a top edge either.
      expect(edges["2026-09-07"].end).toBe(true);
      expect(edges["2026-09-07"].continuesDown).toBe(true);
      expect(edges["2026-09-08"].start).toBe(true);
      expect(edges["2026-09-08"].continuesUp).toBe(false);
      // Only the two true ends are rounded, so a row boundary is not mistaken for the window's end.
      expect(edges["2026-09-08"].roundStart).toBe(false);
      expect(edges["2026-09-15"].roundEnd).toBe(false);
    });
  });

  it("renders a simple phase cell with a menses stripe and one monitor marker", () => {
    render(
      <DayCell
        dateKey="2026-01-14"
        dayNumber={14}
        info={"post-calendar"}
        forecast={false}
        menses
        monitor="high"
        intercourse
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    );

    const cell = screen.getByTestId("day-cell");
    expect(cell).toHaveAttribute("data-phase", "after");
    expect(cell.className).toContain("bg-fertility-status-post-peak");
    expect(cell.querySelector('[data-testid="calendar-menses-stripe"]')).not.toBeNull();
    expect(cell.querySelector('[data-testid="calendar-monitor-marker"]')?.className).toContain(
      "bg-fertility-monitor-high",
    );
    // No assumed-data asterisk is rendered anywhere.
    expect(cell.querySelector('[data-testid="calendar-assumed-marker"]')).toBeNull();
    expect(cell.textContent).not.toContain("*");
    expect(cell.querySelector('[title="Intercourse"]')).toBeNull();
    expect(cell.querySelector('[title="Predicted ovulation"]')).toBeNull();
  });

  it("names the date, phase, monitor value, and menses in the cell accessible label", () => {
    render(
      <DayCell
        dateKey="2026-01-14"
        dayNumber={14}
        info={"post-calendar"}
        forecast={false}
        menses
        monitor="high"
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    );

    const label = screen.getByTestId("day-cell").getAttribute("aria-label") ?? "";
    expect(label).toContain("2026-01-14");
    expect(label).toContain("After");
    expect(label).toContain("monitor high");
    expect(label).toContain("menses");
    expect(label).not.toContain("assumed");
  });

  it("exposes secondary indicators in the full-detail cell presentation", () => {
    render(
      <DayCell
        dateKey="2026-01-15"
        dayNumber={15}
        info={"fertile"}
        forecast={false}
        menses={false}
        monitor="peak"
        intercourse
        isToday={false}
        detailMode="full"
        onSelect={() => {}}
      />,
    );

    const cell = screen.getByTestId("day-cell");
    expect(cell.className).toContain("bg-fertility-status-fertile");
    expect(cell.querySelector('[title="Intercourse"] svg')).not.toBeNull();
    // no single-day ovulation estimate is rendered in any presentation
    expect(cell.querySelector('[title="Predicted ovulation"]')).toBeNull();
  });

  it("keeps the phase fill on a projected cell so the window status still reads", () => {
    render(
      <DayCell
        dateKey="2026-01-09"
        dayNumber={9}
        info={"fertile"}
        forecast
        menses={false}
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    );

    const cell = screen.getByTestId("day-cell");
    // The phase survives; the dashes are what say "not yet". They sit on a descendant, because a
    // border on the cell itself shrinks the padding box the window bar is positioned against.
    expect(cell.className).toContain("bg-fertility-status-fertile");
    expect(cell.className).not.toContain("border-fertility-forecast-border");
    expect(outlineClasses()).toContain("border-dashed border-fertility-forecast-border");
    expect(cell).toHaveAttribute("data-forecast", "true");
    expect(cell.getAttribute("aria-label")).toContain("predicted fertile window day");
  });
  it("renders predictive forecast cells and additive raw markers with tokenized cues", () => {
    render(
      <DayCell
        dateKey="2026-01-02"
        dayNumber={2}
        info={null}
        forecast
        menses
        monitor="low"
        intercourse
        isToday={false}
        detailMode="full"
        onSelect={() => {}}
      />,
    );

    const cell = screen.getByTestId("day-cell");
    expect(cell.className).toContain("bg-fertility-forecast-bg");
    expect(cell.className).toContain("border-dashed border-fertility-forecast-border");
    expect(cell.querySelector('[title="Monitor: low"]')?.className).toContain(
      "bg-fertility-monitor-low",
    );
    expect(cell.querySelector('[title="Menses"]')?.className).toContain(
      "bg-fertility-marker-menses",
    );
    expect(cell.querySelector('[title="Intercourse"] svg')?.getAttribute("class")).toContain(
      "fill-fertility-marker-intercourse",
    );
    expect(cell.querySelector('[data-testid="calendar-assumed-marker"]')).toBeNull();
    expect(cell.querySelector('[title="Predicted ovulation"]')).toBeNull();
  });

  it("gives projected days and window-forecast days the same predictive cue", () => {
    const projected = render(
      <DayCell
        dateKey="2026-01-09"
        dayNumber={9}
        info={"fertile"}
        forecast
        menses={false}
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    );
    const projectedCell = screen.getByTestId("day-cell");
    // A predicted day inside the window is marked by an outline outside the bar, not by a border on
    // the cell. The phase survives, which is what distinguishes a predicted day.
    expect(projectedCell.className).toContain("bg-fertility-status-fertile");
    expect(outlineClasses()).toContain("border-fertility-forecast-border");
    projected.unmount();

    render(
      <DayCell
        dateKey="2026-01-10"
        dayNumber={10}
        info={null}
        forecast
        menses={false}
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    );
    const forecastCell = screen.getByTestId("day-cell");
    // A forecast day with no status falls back to the forecast fill. It is outside the window, so it
    // keeps the plain dashed border rather than the run outline — same cue, simpler shape.
    expect(forecastCell.className).toContain("border-fertility-forecast-border");
    expect(forecastCell.className).toContain("bg-fertility-forecast-bg");
    expect(screen.queryByTestId("calendar-run-outline")).toBeNull();
  });

  it("keeps raw markers but removes interpretation styling when the algorithm is off", async () => {
    const cycle = await store().setNewCycle(addDays(todayKey(), -5));
    await store().addDayRecord(cycle.id, addDays(todayKey(), -5), 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(todayKey(), -4), 2, { monitor: "high" });
    await store().updateSettings({ algorithmEnabled: false });

    render(<CalendarView />);

    for (const cell of screen.getAllByTestId("day-cell")) {
      expect(cell.className).not.toContain("bg-fertility-status-");
      expect(cell.className).not.toContain("bg-fertility-forecast-bg");
      expect(cell.getAttribute("data-phase")).toBeNull();
    }
    expect(screen.getByTitle("Monitor: high").className).toContain("bg-fertility-monitor-high");
  });

  it("shows a grouped phase-first legend by default", () => {
    render(<CalendarView />);

    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("Fertile")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
    expect(screen.getByText("Menses")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Peak")).toBeInTheDocument();
    // Provenance and evidence-source cues are gone from the legend.
    expect(screen.queryByText("Assumed")).not.toBeInTheDocument();
    expect(screen.queryByText("Pre-fertile")).not.toBeInTheDocument();
    expect(screen.queryByText("Post-peak")).not.toBeInTheDocument();
    expect(screen.queryByText("Post-calendar")).not.toBeInTheDocument();
  });

  it("reveals the full-detail legend from the Calendar", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    await user.click(screen.getByRole("button", { name: /show full detail/i }));

    expect(await screen.findByText("Intercourse")).toBeInTheDocument();
    expect(screen.getByText("Predicted")).toBeInTheDocument();
    // the single-day ovulation estimate is gone from the vocabulary
    expect(screen.queryByText("Predicted ovulation")).not.toBeInTheDocument();
    // one predictive key covers both the forecast window and projected days
    expect(screen.getAllByText("Predicted")).toHaveLength(1);
    expect(screen.queryByText("Predicted window")).not.toBeInTheDocument();
    expect(screen.queryByText("Projected")).not.toBeInTheDocument();
    expect(screen.queryByText("Confirmed source")).not.toBeInTheDocument();
    expect(screen.queryByText("Predicted status")).not.toBeInTheDocument();
  });
});

function stubMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function nowYear(): number {
  return new Date().getFullYear();
}

function nowMonth(): number {
  return new Date().getMonth();
}

function firstDayOfNextMonth(): string {
  const now = new Date();
  return dateKeyLocal(new Date(now.getFullYear(), now.getMonth() + 1, 1));
}

function monthTitleFor(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftedMonth(label: string, delta: number): string {
  const [month, year] = label.split(" ");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const total = Number(year) * 12 + months.indexOf(month) + delta;
  return `${months[((total % 12) + 12) % 12]} ${Math.floor(total / 12)}`;
}
describe("CalendarView with cycle projection", () => {
  /** Nine cycles of history so the calendar rule applies, then an open cycle. */
  async function seedHistory() {
    let day1 = addDays(todayKey(), -250);
    for (let i = 0; i < 8; i++) {
      const cycle = await store().setNewCycle(day1);
      await store().addDayRecord(cycle.id, addDays(day1, 11), 12, { monitor: "peak" });
      day1 = addDays(day1, 28);
    }
    await store().setNewCycle(day1);
  }

  it("projects nothing while the setting is off, and touches no stored record", async () => {
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    // paint it once, so there is something that could be left behind
    render(<CalendarView />);
    cleanup();
    const before = { cycles: store().cycles.length, records: store().dayRecords.length };
    const beforeIds = store()
      .dayRecords.map((r) => r.id)
      .sort();

    await store().updateSettings({ projectFutureCycles: false });
    render(<CalendarView />);

    const projected = screen
      .getAllByTestId("day-cell")
      .filter((el) => el.getAttribute("data-forecast") === "true");
    expect(projected).toHaveLength(0);
    // disabling removes the drawing and nothing else
    expect(store().cycles).toHaveLength(before.cycles);
    expect(store().dayRecords).toHaveLength(before.records);
    expect(
      store()
        .dayRecords.map((r) => r.id)
        .sort(),
    ).toEqual(beforeIds);
  });

  it("paints projected days when the setting is on", async () => {
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    render(<CalendarView />);

    await waitFor(() => {
      const projected = screen
        .getAllByTestId("day-cell")
        .filter((el) => el.getAttribute("data-forecast") === "true");
      expect(projected.length).toBeGreaterThan(0);
    });
  });

  it("keeps a phase fill on projected days so the window status reads", async () => {
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    render(<CalendarView />);

    await waitFor(() => {
      const projected = screen
        .getAllByTestId("day-cell")
        .filter((el) => el.getAttribute("data-forecast") === "true");
      // Every projected day with a status keeps a real phase fill, and the dashes are what mark it as
      // not yet happened. A day inside the window carries the run outline; a day outside it carries
      // the plain border. Either way the cue is dashed.
      const phased = projected.filter((el) => el.getAttribute("data-phase"));
      expect(phased.length).toBeGreaterThan(0);
      for (const el of phased) {
        const dashed =
          el.className.includes("border-dashed") ||
          !!el.querySelector('[data-testid="calendar-run-outline"]');
        expect(dashed, `${el.getAttribute("data-date")} carries no dashed cue`).toBe(true);
      }
    });
  });

  it("leaves no date after today unpainted across paged months", async () => {
    const user = userEvent.setup();
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    render(<CalendarView />);

    // Page well past the current cycle: the chain has to follow, which means
    // the range must cover the whole visible month and not just today. A month
    // grid's final week often falls outside the month entirely.
    for (let page = 0; page < 6; page++) {
      await user.click(screen.getByRole("button", { name: /next month/i }));
      const future = screen
        .getAllByTestId("day-cell")
        .filter((el) => (el.getAttribute("data-date") ?? "") > todayKey());
      expect(future.length).toBeGreaterThan(0);
      for (const el of future) {
        expect(el.getAttribute("data-forecast"), `unpainted ${el.getAttribute("data-date")}`).toBe(
          "true",
        );
      }
    }
  });

  it("projects a whole month that lies beyond the first projected cycle", async () => {
    const user = userEvent.setup();
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    render(<CalendarView />);

    // three months out: the open cycle's own projected length cannot reach here
    for (let page = 0; page < 3; page++) {
      await user.click(screen.getByRole("button", { name: /next month/i }));
    }
    await waitFor(() => {
      const future = screen
        .getAllByTestId("day-cell")
        .filter((el) => (el.getAttribute("data-date") ?? "") > todayKey());
      expect(future.length).toBeGreaterThan(20);
      for (const el of future) {
        expect(el.getAttribute("data-forecast"), `unpainted ${el.getAttribute("data-date")}`).toBe(
          "true",
        );
        // a projected day inside a covered cycle still carries a phase
        expect(el.getAttribute("data-phase")).toBeTruthy();
      }
    });
  });

  it("marks a projected cycle day 1 with the menses stripe", async () => {
    const user = userEvent.setup();
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    render(<CalendarView />);

    for (let page = 0; page < 2; page++) {
      await user.click(screen.getByRole("button", { name: /next month/i }));
    }
    // somewhere in this month a projected cycle begins
    await waitFor(() => {
      const withMenses = screen
        .getAllByTestId("day-cell")
        .filter((el) => el.getAttribute("data-forecast") === "true")
        .filter((el) => el.querySelector('[data-testid="calendar-menses-stripe"]'));
      expect(withMenses.length).toBeGreaterThan(0);
    });
  });

  it("still shows the existing next-window forecast while the projection is off", async () => {
    // an open cycle recent enough that its forecast window reaches past today
    await seedHistory();
    await store().setNewCycle(addDays(todayKey(), -5));
    await store().updateSettings({ projectFutureCycles: false });
    render(<CalendarView />);

    // the pre-existing overlay is untouched by the new setting
    await waitFor(() => {
      const forecast = screen
        .getAllByTestId("day-cell")
        .filter((el) => el.getAttribute("data-forecast") === "true");
      expect(forecast.length).toBeGreaterThan(0);
    });
  });

  it("shows no projected output when interpretation is disabled", async () => {
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true, algorithmEnabled: false });
    render(<CalendarView />);

    const projected = screen
      .getAllByTestId("day-cell")
      .filter((el) => el.getAttribute("data-forecast") === "true");
    expect(projected).toHaveLength(0);
    // with interpretation off there is no predictive treatment to explain, so
    // its key is withdrawn along with the other derived ones
    expect(screen.queryByText("Predicted")).not.toBeInTheDocument();
    expect(screen.getByText("Menses")).toBeInTheDocument();
  });

  it("describes the predictive treatment with one key, projection on or off", async () => {
    render(<CalendarView />);
    const offSample = document.querySelector('[data-legend-label="Predicted"]')?.firstElementChild;
    // the sample carries the dashed cue projected and forecast cells both use
    expect(offSample?.className).toContain("border-dashed");
    expect(offSample?.className).toContain("bg-fertility-forecast-bg");

    cleanup();
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    render(<CalendarView />);

    expect(await screen.findByText("Predicted")).toBeInTheDocument();
    expect(screen.getAllByText("Predicted")).toHaveLength(1);
    const onSample = document.querySelector('[data-legend-label="Predicted"]')?.firstElementChild;
    expect(onSample?.className).toContain("border-dashed");
  });

  it("refuses to log a projected day", async () => {
    const user = userEvent.setup();
    stubMatchMedia();
    await seedHistory();
    await store().updateSettings({ projectFutureCycles: true });
    render(
      <>
        <CalendarView />
        <Toaster />
      </>,
    );

    const future = addDays(todayKey(), 3);
    // The view renders one month at a time, so from the 28th onward "today + 3" lands
    // in the next month and the cell this test looks for was never rendered — it failed
    // on the date rather than on the behaviour. Show whichever month holds the day.
    if (monthTitleFor(parseDateKey(future)) !== monthTitleFor(parseDateKey(todayKey()))) {
      await user.click(screen.getByRole("button", { name: /next month/i }));
    }

    const cell = cellByDate(future);
    expect(cell).not.toBeNull();
    // it is painted as a projected day, and still not loggable
    expect(cell!).toHaveAttribute("data-forecast", "true");
    await user.click(cell!);
    await waitFor(() => {
      expect(screen.getByText(/future dates cannot be logged/i)).toBeInTheDocument();
    });
    // nothing was written
    expect(store().dayRecords.every((r) => r.date <= todayKey())).toBe(true);
  });
});

describe("day cell layer visibility", () => {
  /** A cell carrying every layer at once, so hiding one can be shown to be surgical. */
  const loaded: DayCellProps = {
    dateKey: "2026-01-14",
    dayNumber: 14,
    info: "fertile",
    forecast: false,
    menses: true,
    monitor: "peak",
    intercourse: true,
    isToday: true,
    detailMode: "full",
    onSelect: () => {},
  };

  /**
   * A cell with every marker loaded and `isToday`, for the layer and cue tests.
   *
   * Returns `{ cell, unmount }`. The other helper in this file — `renderPhaseCell` — takes a
   * phase status instead and returns the raw `render()` handle.
   */
  function renderCell(overrides: Partial<DayCellProps> = {}, hidden: string[] = []) {
    const { unmount } = render(
      <DayCell
        {...loaded}
        {...overrides}
        hiddenLayers={hidden as never}
        key={hidden.join(",") + JSON.stringify(overrides)}
      />,
    );
    const cell = screen.getByTestId("day-cell");
    return { cell, unmount };
  }

  const stripe = '[data-testid="calendar-menses-stripe"]';
  const marker = '[data-testid="calendar-monitor-marker"]';

  // Phase and forecast classes sit on the cell itself; monitor, menses and
  // intercourse classes sit on descendants, so both places are checked.
  const hasClass =
    (cls: string) =>
    (cell: HTMLElement): boolean =>
      cell.classList.contains(cls) || cell.querySelector(`.${cls}`) !== null;
  const has = (selector: string) => (cell: HTMLElement) => cell.querySelector(selector) !== null;

  it.each([
    ["before", { info: "pre-fertile" as const }, hasClass("bg-fertility-status-pre")],
    ["fertile", { info: "fertile" as const }, hasClass("bg-fertility-status-fertile-window")],
    ["after", { info: "post-peak" as const }, hasClass("bg-fertility-status-post-peak")],
    ["predicted", { info: null, forecast: true }, hasClass("bg-fertility-forecast-bg")],
    ["menses", {}, has(stripe)],
    ["low", { monitor: "low" as const }, hasClass("bg-fertility-monitor-low")],
    ["high", { monitor: "high" as const }, hasClass("bg-fertility-monitor-high")],
    ["peak", { monitor: "peak" as const }, hasClass("bg-fertility-monitor-peak")],
    ["intercourse", {}, has('[title="Intercourse"]')],
  ] as const)("hiding %s removes that layer from the cell", (id, overrides, painted) => {
    const shown = renderCell(overrides);
    expect(painted(shown.cell), `${id} is painted while shown`).toBe(true);
    shown.unmount();

    const hidden = renderCell(overrides, [id]);
    expect(painted(hidden.cell), `${id} is still painted while hidden`).toBe(false);
  });

  it("hiding the predictive layer removes the dashed cue as well as the forecast fill", () => {
    const { cell } = renderCell({ info: null, forecast: true }, ["predicted"]);
    expect(cell.className).not.toContain("border-fertility-forecast-border");
  });

  /**
   * The table above hides one layer and checks that layer's own paint. That is one direction, and the
   * direction this defect lived in was the other: a Predicted day must keep its dashes under EVERY
   * combination of hidden layers.
   *
   * It lost them because two places asked "does this day draw a window bar?" and disagreed. One asked
   * whether the status is fertile; the other asked whether the Fertile layer is on as well. Hide
   * Fertile and the bar went while the cue decision did not, leaving a forecast fill with no dashes —
   * and the dashes are the only sign that the day has not happened. One layer at a time never showed
   * it, because both answers agree whenever only one layer is touched.
   */
  const RUN_MIDDLE: WindowEdges = {
    start: false,
    end: false,
    continuesUp: false,
    continuesDown: false,
    roundStart: false,
    roundEnd: false,
  };

  it.each(CALENDAR_LAYERS.map((layer) => layer.id).filter((id) => id !== "predicted"))(
    "a predicted window day keeps its dashed cue with the %s layer hidden",
    (hidden) => {
      const { cell } = renderCell({ info: "fertile", forecast: true, windowEdges: RUN_MIDDLE }, [
        hidden,
      ]);
      const dashed =
        cell.classList.contains("border-dashed") ||
        cell.querySelector('[data-testid="calendar-run-outline"]') !== null;
      expect(dashed, `a predicted day lost its cue with "${hidden}" hidden`).toBe(true);
    },
  );

  it("hiding every layer at once still leaves a predicted day marked", () => {
    // The same invariant at the extreme: no layer is painted, but the day is still a prediction and
    // the user must still be able to tell.
    const { cell } = renderCell(
      { info: "fertile", forecast: true, windowEdges: RUN_MIDDLE },
      CALENDAR_LAYERS.map((layer) => layer.id).filter((id) => id !== "predicted"),
    );
    expect(cell.className).toContain("border-dashed");
  });

  it("hiding one layer leaves every other layer painted", () => {
    const { cell } = renderCell({}, ["menses"]);
    expect(cell.querySelector(stripe)).toBeNull();
    expect(cell.className).toContain("bg-fertility-status-fertile");
    expect(cell.querySelector(marker)?.className).toContain("bg-fertility-monitor-peak");
    expect(cell.querySelector('[title="Intercourse"]')).not.toBeNull();
  });

  it("keeps the day number, the today ring, and the click target when every layer is hidden", async () => {
    const user = userEvent.setup();
    let selected: string | null = null;
    const { cell } = renderCell({ onSelect: (date: string) => (selected = date) }, [
      "before",
      "fertile",
      "after",
      "predicted",
      "menses",
      "low",
      "high",
      "peak",
      "intercourse",
    ]);
    expect(cell.textContent).toBe("14");
    // The ring is an element, not a box-shadow on the cell. Matching `ring-2` here would have passed
    // on `focus-visible:ring-2`, which the cell carries either way.
    expect(cell.querySelector('[data-testid="calendar-today-ring"]')).not.toBeNull();
    await user.click(cell);
    expect(selected).toBe("2026-01-14");
  });

  it("leaves the accessible description identical when layers are hidden", () => {
    const shown = renderCell();
    const shownLabel = shown.cell.getAttribute("aria-label");
    shown.unmount();

    const hidden = renderCell({}, ["before", "menses", "peak", "intercourse"]);
    expect(hidden.cell.getAttribute("aria-label")).toBe(shownLabel);
    expect(shownLabel).toContain("monitor peak");
    expect(shownLabel).toContain("Fertile");
    expect(shownLabel).toContain("menses");
    expect(shownLabel).toContain("intercourse");
  });

  it("names both claims when a predicted day carries both", () => {
    // A period start the fertile window also covers. The fertile claim is the one that must not be
    // buried, so it is named alongside the period rather than losing a precedence contest to it.
    const period = renderCell({ info: "fertile", forecast: true, cycleStart: true });
    const label = period.cell.getAttribute("aria-label") ?? "";
    expect(label).toContain("predicted period start");
    expect(label).toContain("predicted fertile window day");
  });

  it("says nothing extra about a predicted day that carries no prediction", () => {
    // A day inside an invented cycle but outside its window. Naming it would put
    // a month of equally blank dates between a reader and the two that matter.
    const { cell } = renderCell({ info: null, forecast: true });
    expect(cell.getAttribute("aria-label")).not.toMatch(/predicted/i);
  });

  it("still reports a predicted day after the cue is hidden", () => {
    // The opt-out removes the visual cue only. A day the app is predicting is
    // still announced as one, so the relaxation never becomes a silent one.
    const { cell } = renderCell({ info: "fertile", forecast: true }, ["predicted"]);
    expect(cell.className).not.toContain("border-fertility-forecast-border");
    expect(cell.getAttribute("aria-label")).toContain("predicted fertile window day");
  });
});

describe("the key sample and the cell paint agree", () => {
  /** The legend label for a layer id. */
  function keyFor(id: string): string {
    return CALENDAR_LAYERS.find((layer) => layer.id === id)!.label;
  }

  /** The classes the declaration says this layer paints. */
  function paintClassesFor(id: string): string[] {
    const paint = LAYER_PAINT[id as CalendarLayerId];
    return [paint.fill, paint.border, paint.marker].filter((cls) => cls !== "");
  }

  const cellFor: Record<string, Partial<DayCellProps>> = {
    before: { info: "pre-fertile" },
    fertile: { info: "fertile" },
    after: { info: "post-peak" },
    predicted: { info: null, forecast: true },
    menses: { info: null, menses: true },
    low: { info: null, monitor: "low" },
    high: { info: null, monitor: "high" },
    peak: { info: null, monitor: "peak" },
    intercourse: { info: null, intercourse: true },
  };

  it.each(Object.keys(cellFor))("the %s key shows the class the day cell paints", async (id) => {
    await store().updateSettings({ calendarDetailMode: "full" });
    const { unmount } = render(
      <DayCell
        dateKey="2026-01-14"
        dayNumber={14}
        info={null}
        forecast={false}
        menses={false}
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="full"
        onSelect={() => {}}
        {...cellFor[id]}
      />,
    );
    // outerHTML, because a fill or border sits on the cell's own class
    // attribute while a marker sits on a descendant.
    const painted = screen.getByTestId("day-cell").outerHTML;
    unmount();

    render(<CalendarView />);
    const label = keyFor(id);
    const swatch = screen.getByRole("button", { name: new RegExp(`^${label}`, "i") });
    const sample = swatch.outerHTML;

    for (const cls of paintClassesFor(id)) {
      expect(painted, `${id} is painted on the cell`).toContain(cls);
      expect(sample, `${id} key shows the same class`).toContain(cls);
    }
  });
});

describe("the predicted cycle-start stripe", () => {
  const stripe = '[data-testid="calendar-menses-stripe"]';

  function renderProjected(hidden: string[] = []) {
    render(
      <DayCell
        dateKey="2026-02-01"
        dayNumber={1}
        info="pre-fertile"
        forecast
        menses={false}
        cycleStart
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="simple"
        hiddenLayers={hidden as never}
        onSelect={() => {}}
      />,
    );
    return screen.getByTestId("day-cell");
  }

  it("paints the stripe for a predicted cycle start without any logged menses", () => {
    expect(renderProjected().querySelector(stripe)).not.toBeNull();
  });

  it("is governed by the predictive layer, so hiding Menses leaves it", () => {
    expect(renderProjected(["menses"]).querySelector(stripe)).not.toBeNull();
  });

  it("is removed by hiding the predictive layer", () => {
    expect(renderProjected(["predicted"]).querySelector(stripe)).toBeNull();
  });
});

describe("legend layer controls", () => {
  /** A cycle with a Peak, so the month paints every derived layer at once. */
  async function seedLayeredMonth() {
    const today = todayKey();
    const day1 = addDays(today, -20);
    const cycle = await store().setNewCycle(day1);
    await store().addDayRecord(cycle.id, day1, 1, { bloodFlow: "medium" });
    await store().addDayRecord(cycle.id, addDays(day1, 11), 12, { monitor: "peak" });
    await store().addDayRecord(cycle.id, addDays(day1, 13), 14, {
      monitor: "low",
      intercourse: true,
    });
  }

  function key(label: string): HTMLElement {
    return screen.getByRole("button", { name: new RegExp(`^${label}`, "i") });
  }

  function queryKey(label: string): HTMLElement | null {
    return screen.queryByRole("button", { name: new RegExp(`^${label}`, "i") });
  }

  /**
   * The store write is asynchronous, so the assertion waits for it to land. The
   * stored order is click order and carries no meaning, so it is compared sorted.
   */
  async function expectHidden(expected: string[]) {
    await waitFor(() =>
      expect([...store().settings.hiddenCalendarLayers].sort()).toEqual([...expected].sort()),
    );
  }

  it("offers every layer as a control that reports itself pressed", async () => {
    await seedLayeredMonth();
    await store().updateSettings({ calendarDetailMode: "full" });
    render(<CalendarView />);

    for (const label of [
      "Before",
      "Fertile",
      "After",
      "Predicted",
      "Menses",
      "Low",
      "High",
      "Peak",
      "Intercourse",
    ]) {
      expect(key(label), label).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("hides and restores a layer from its own key", async () => {
    const user = userEvent.setup();
    await seedLayeredMonth();
    render(<CalendarView />);

    await user.click(key("Menses"));
    await expectHidden(["menses"]);
    await waitFor(() => expect(key("Menses")).toHaveAttribute("aria-pressed", "false"));

    await user.click(key("Menses"));
    await expectHidden([]);
    await waitFor(() => expect(key("Menses")).toHaveAttribute("aria-pressed", "true"));
  });

  it("keeps a hidden key readable while showing it as hollow", async () => {
    const user = userEvent.setup();
    await seedLayeredMonth();
    render(<CalendarView />);

    // React reuses the node, so the class is captured rather than the element.
    const before = key("Fertile").querySelector("span")?.className;
    await user.click(key("Fertile"));
    await expectHidden(["fertile"]);
    const after = key("Fertile").querySelector("span")?.className;

    expect(key("Fertile")).toHaveTextContent("Fertile");
    expect(before).toContain("bg-fertility-status-fertile");
    expect(after).not.toContain("bg-fertility-status-fertile");
    expect(after).toContain("border");
  });

  it("removes the menses stripe from day cells without touching the record", async () => {
    const user = userEvent.setup();
    const today = todayKey();
    // Five days back rather than twenty: the Calendar renders one month at a time, so a day that far
    // back can fall in the previous month, and then the cell this test looks up was never rendered at
    // all. The missing cell returned `undefined` where the assertion expected `null`, which reads as a
    // broken assertion rather than as "that day is not on screen". The test is about hiding a layer, so
    // it seeds inside the displayed month and says nothing about navigation.
    const day1 = addDays(today, -5);
    const cycle = await store().setNewCycle(day1);
    await store().addDayRecord(cycle.id, day1, 1, { bloodFlow: "medium" });
    render(<CalendarView />);

    expect(cellByDate(day1), "the seeded day is on screen").not.toBeNull();
    const stripe = () => cellByDate(day1)?.querySelector('[data-testid="calendar-menses-stripe"]');
    expect(stripe()).not.toBeNull();

    await user.click(key("Menses"));
    await expectHidden(["menses"]);
    await waitFor(() => expect(stripe()).toBeNull());

    // The record itself is untouched and still editable.
    expect(store().dayRecords.find((r) => r.date === day1)?.bloodFlow).toBe("medium");
  });

  it("withdraws the derived keys with the algorithm off and keeps the raw ones", async () => {
    await seedLayeredMonth();
    await store().updateSettings({ algorithmEnabled: false });
    render(<CalendarView />);

    for (const label of ["Before", "Fertile", "After", "Predicted"]) {
      expect(queryKey(label), label).toBeNull();
    }
    for (const label of ["Menses", "Low", "High", "Peak"]) {
      expect(key(label), label).toBeInTheDocument();
    }
  });

  it("offers the intercourse key only in the full-detail presentation", async () => {
    const user = userEvent.setup();
    await seedLayeredMonth();
    render(<CalendarView />);
    expect(queryKey("Intercourse")).toBeNull();

    await user.click(screen.getByRole("button", { name: /show full detail/i }));
    expect(await screen.findByRole("button", { name: /^Intercourse/i })).toBeInTheDocument();
  });

  it("keeps a hidden layer hidden while paging months and back", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    await user.click(key("Menses"));
    await expectHidden(["menses"]);

    const current = monthTitleFor(parseDateKey(todayKey()));
    await user.click(screen.getByRole("button", { name: /next month/i }));
    await screen.findByText(shiftedMonth(current, 1));
    expect(key("Menses")).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: /previous month/i }));
    await screen.findByText(current);
    expect(key("Menses")).toHaveAttribute("aria-pressed", "false");
    expect(cellByDate(todayKey())?.querySelector('[data-testid="calendar-menses-stripe"]')).toBe(
      null,
    );
  });

  it("keeps a stored intercourse choice across a change of presentation", async () => {
    const user = userEvent.setup();
    await store().updateSettings({ calendarDetailMode: "full" });
    render(<CalendarView />);

    await user.click(key("Intercourse"));
    await expectHidden(["intercourse"]);

    // The key is withdrawn in the simple presentation, so the choice has to
    // survive without a way to see or change it.
    await user.click(screen.getByRole("button", { name: /show simple view/i }));
    await waitFor(() => expect(queryKey("Intercourse")).toBeNull());
    expect(store().settings.hiddenCalendarLayers).toEqual(["intercourse"]);

    await user.click(screen.getByRole("button", { name: /show full detail/i }));
    expect(await screen.findByRole("button", { name: /^Intercourse/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps a stored choice for a withdrawn key and restores it when the key returns", async () => {
    const user = userEvent.setup();
    await seedLayeredMonth();
    render(<CalendarView />);

    await user.click(key("Fertile"));
    await expectHidden(["fertile"]);

    await store().updateSettings({ algorithmEnabled: false });
    await waitFor(() => expect(queryKey("Fertile")).toBeNull());
    expect(store().settings.hiddenCalendarLayers).toEqual(["fertile"]);

    await store().updateSettings({ algorithmEnabled: true });
    expect(await screen.findByRole("button", { name: /^Fertile/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("Show all", () => {
  /** Sorted, because the stored order is click order and carries no meaning. */
  async function expectHidden(expected: string[]) {
    await waitFor(() =>
      expect([...store().settings.hiddenCalendarLayers].sort()).toEqual([...expected].sort()),
    );
  }

  it("is absent while nothing is hidden", () => {
    render(<CalendarView />);
    expect(screen.queryByRole("button", { name: /show all/i })).toBeNull();
  });

  it("restores every key currently on screen", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    await user.click(screen.getByRole("button", { name: /^Menses/i }));
    await user.click(screen.getByRole("button", { name: /^Fertile/i }));
    await expectHidden(["menses", "fertile"]);

    await user.click(await screen.findByRole("button", { name: /show all/i }));
    await expectHidden([]);
    await waitFor(() => expect(screen.queryByRole("button", { name: /show all/i })).toBeNull());
  });

  it("leaves a stored choice for a key it is not showing", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    await user.click(screen.getByRole("button", { name: /^Fertile/i }));
    await user.click(screen.getByRole("button", { name: /^Menses/i }));
    await expectHidden(["menses", "fertile"]);

    await store().updateSettings({ algorithmEnabled: false });
    await waitFor(() => expect(screen.queryByRole("button", { name: /^Fertile/i })).toBeNull());

    await user.click(await screen.findByRole("button", { name: /show all/i }));
    await expectHidden(["fertile"]);

    await store().updateSettings({ algorithmEnabled: true });
    expect(await screen.findByRole("button", { name: /^Fertile/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("changes no stored record", async () => {
    const user = userEvent.setup();
    const today = todayKey();
    const cycle = await store().setNewCycle(addDays(today, -3));
    await store().addDayRecord(cycle.id, today, 4, { monitor: "high", bloodFlow: "light" });
    const before = structuredClone(store().dayRecords);
    render(<CalendarView />);

    await user.click(screen.getByRole("button", { name: /^Menses/i }));
    await expectHidden(["menses"]);
    await user.click(await screen.findByRole("button", { name: /show all/i }));
    await expectHidden([]);

    expect(store().dayRecords).toEqual(before);
  });
});

describe("Basal body temperature entry", () => {
  function bbtField() {
    return screen.getByTestId("bbt") as HTMLInputElement;
  }

  async function openEntryFor(dateKey: string) {
    const user = userEvent.setup();
    render(<CalendarView />);
    await user.click(cellByDate(dateKey)!);
    await screen.findByRole("dialog");
    return user;
  }

  function coverDate() {
    return dateKeyLocal(new Date(nowYear(), nowMonth(), 1));
  }

  it("labels, hints, and steps the field for the active unit", async () => {
    await openEntryFor(coverDate());

    expect(screen.getByText("BBT (°C)")).toBeInTheDocument();
    expect(bbtField()).toHaveAttribute("step", "0.01");
    expect(screen.getByTestId("bbt-hint")).toHaveTextContent("Usual range 35–38 °C");

    await store().updateSettings({ temperatureUnit: "f" });

    expect(screen.getByText("BBT (°F)")).toBeInTheDocument();
    expect(bbtField()).toHaveAttribute("step", "0.1");
    expect(screen.getByTestId("bbt-hint")).toHaveTextContent("Usual range 95–100.4 °F");
  });

  it("pre-populates an existing reading in the active unit without changing it", async () => {
    const day1 = coverDate();
    const cycle = await store().setNewCycle(day1);
    await store().addDayRecord(cycle.id, day1, 1, { bbt: 36.5 });

    await openEntryFor(day1);
    expect(bbtField()).toHaveValue(36.5);

    // Opening the form must not rewrite the stored value.
    expect(store().dayRecords[0].bbt).toBe(36.5);

    await store().updateSettings({ temperatureUnit: "f" });
    expect(bbtField()).toHaveValue(97.7);
    expect(store().dayRecords[0].bbt).toBe(36.5);
  });

  it("stores a Fahrenheit entry in Celsius", async () => {
    const day1 = coverDate();
    await store().setNewCycle(day1);
    await store().updateSettings({ temperatureUnit: "f" });

    const user = await openEntryFor(day1);
    await user.type(bbtField(), "98.2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(store().dayRecords).toHaveLength(1));
    expect(store().dayRecords[0].bbt).toBeCloseTo(36.7778, 4);
  });

  it("refuses a Fahrenheit reading typed into a Celsius field and explains why", async () => {
    const day1 = coverDate();
    const cycle = await store().setNewCycle(day1);

    const user = await openEntryFor(day1);
    await user.type(bbtField(), "98.2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/looks like a Fahrenheit reading/i)).toBeInTheDocument();
    expect(screen.getByText(/36\.78/)).toBeInTheDocument();
    // Nothing coerced, nothing stored, and the form stays editable.
    expect(store().dayRecords).toHaveLength(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(bbtField()).toHaveValue(98.2);
    expect(cycle.id).toBeTruthy();
  });

  it("refuses a value no person could have, without blaming either unit", async () => {
    await openEntryFor(coverDate());
    const user = userEvent.setup();

    await user.type(bbtField(), "50");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/not a temperature a person could have/i)).toBeInTheDocument();
    expect(store().dayRecords).toHaveLength(0);
  });

  it("saves an unusual-but-plausible reading only after it is confirmed", async () => {
    const day1 = coverDate();
    const cycle = await store().setNewCycle(day1);
    const user = await openEntryFor(day1);

    await user.type(bbtField(), "38.5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const warning = await screen.findByTestId("bbt-warning");
    expect(warning).toHaveTextContent("outside the usual basal range");
    expect(warning).toHaveTextContent("35–38 °C");
    // Still nothing stored while the warning is up.
    expect(store().dayRecords).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Save anyway" }));

    await waitFor(() => expect(store().dayRecords).toHaveLength(1));
    expect(store().dayRecords[0].bbt).toBeCloseTo(38.5, 5);
    expect(store().dayRecords[0].cycleId).toBe(cycle.id);
  });

  it("stores nothing when the warning is dismissed", async () => {
    const day1 = coverDate();
    await store().setNewCycle(day1);
    const user = await openEntryFor(day1);

    await user.type(bbtField(), "34.5");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByTestId("bbt-warning");

    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.queryByTestId("bbt-warning")).toBeNull();
    expect(store().dayRecords).toHaveLength(0);
    // The value is still there to correct rather than having been thrown away.
    expect(bbtField()).toHaveValue(34.5);
  });

  it("clears the temperature when the field is emptied", async () => {
    const day1 = coverDate();
    const cycle = await store().setNewCycle(day1);
    await store().addDayRecord(cycle.id, day1, 1, { bbt: 36.5 });

    const user = await openEntryFor(day1);
    await user.clear(bbtField());
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(store().dayRecords[0].bbt).toBeNull());
  });

  it("saves a usual reading with no warning", async () => {
    const day1 = coverDate();
    await store().setNewCycle(day1);
    const user = await openEntryFor(day1);

    await user.type(bbtField(), "36.7");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(store().dayRecords).toHaveLength(1));
    expect(store().dayRecords[0].bbt).toBeCloseTo(36.7, 5);
    expect(screen.queryByTestId("bbt-warning")).toBeNull();
  });
});
