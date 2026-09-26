import { addDays } from "@/core/engine/dateUtils";
import { useAppStore } from "@/core/store/useAppStore";

const store = () => useAppStore.getState();

let rectShimInstalled = false;

/**
 * jsdom shim for Recharts' ResponsiveContainer: browsers have ResizeObserver,
 * jsdom does not, and its getBoundingClientRect always returns 0 — which would
 * collapse the chart to zero size. Stub both so chart–measuring works in tests.
 * Contained to each worker because Vitest isolates test files (own env copy).
 */
export function installChartShim(): void {
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  }
  const rect: DOMRect = {
    width: 400,
    height: 260,
    top: 0,
    left: 0,
    right: 400,
    bottom: 260,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
  if (!rectShimInstalled) {
    HTMLElement.prototype.getBoundingClientRect = () => rect;
    rectShimInstalled = true;
  }
}

/** Reset the singleton store to an empty, hydrated state (calendar.test.tsx pattern). */
export async function resetStore(): Promise<void> {
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().hydrate();
  await useAppStore.getState().clearAllData();
}

export interface SeededCycles {
  /** Closed 28-day cycle: menses day 1, High day 8, Peak(+mucus) day 14, BBT days 8..15 (day 12 null), intercourse day 18. */
  a: string;
  /** Open cycle (records through day 6). */
  b: string;
}

/**
 * Seeds the fixture from `specs/001-cycle-strip-chart/quickstart.md` §"Component test fixture":
 * - Cycle A: closed via setNewCycle auto-close, spans 28 days.
 * - Cycle B: open, latest recorded dayInCycle 6.
 */
export async function seedCycles(): Promise<SeededCycles> {
  await resetStore();

  const day1A = "2026-01-01";
  const day1B = "2026-01-29";

  const { id: a } = await store().setNewCycle(day1A);
  await store().addDayRecord(a, day1A, 1, { bloodFlow: "medium" });
  await store().addDayRecord(a, addDays(day1A, 7), 8, { monitor: "high" });
  await store().addDayRecord(a, addDays(day1A, 13), 14, { monitor: "peak", mucus: "peak" });
  for (let day = 8; day <= 15; day++) {
    const bbt = day === 12 ? null : 36.2 + day * 0.03;
    await store().addDayRecord(a, addDays(day1A, day - 1), day, { bbt });
  }
  await store().addDayRecord(a, addDays(day1A, 17), 18, { intercourse: true });

  const { id: b } = await store().setNewCycle(day1B);
  await store().addDayRecord(b, day1B, 1, { bloodFlow: "medium" });
  for (let day = 2; day <= 6; day++) {
    await store().addDayRecord(
      b,
      addDays(day1B, day - 1),
      day,
      day === 3 ? { monitor: "low" } : {},
    );
  }

  return { a, b };
}
