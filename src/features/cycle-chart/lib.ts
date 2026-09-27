import { addDays } from "@/core/engine/dateUtils";
import type {
  BeginRule,
  CycleResult,
  DateKey,
  DayStatus,
  EndRule,
  MonitorReading,
  MucusLevel,
} from "@/core/engine/types";
import type { CycleEntity, DayRecordEntity } from "@/core/store/entities";

export interface StripDay {
  day: number;
  date: DateKey;
  monitor?: MonitorReading;
  mucus?: MucusLevel;
  bbt: number | null;
  intercourse: boolean;
  status: DayStatus | null;
}

export interface StripWindow {
  begin: number;
  end: number | null;
  beginRule: BeginRule;
  endRule: EndRule;
}

export interface StripModel {
  cycleId: string;
  cycleNo: number;
  day1: DateKey;
  open: boolean;
  span: number;
  days: StripDay[];
  window: StripWindow | null;
}

/**
 * Derives the chart data for one cycle from the store snapshot.
 * Pure: no Marquette computation — the window is copied from the engine result.
 */
export function buildStripModel(
  cycle: CycleEntity,
  result: CycleResult | undefined,
  records: DayRecordEntity[],
  algorithmEnabled: boolean,
): StripModel {
  const span = cycleSpan(result, records);
  const byDay = new Map<number, DayRecordEntity>();
  for (const record of records) {
    byDay.set(record.dayInCycle, record);
  }

  const statusByDay = new Map<number, DayStatus>();
  for (const day of result?.days ?? []) {
    statusByDay.set(day.day, day.status);
  }

  const days: StripDay[] = [];
  for (let day = 1; day <= span; day++) {
    const record = byDay.get(day);
    days.push({
      day,
      date: record?.date ?? addDays(cycle.day1, day - 1),
      monitor: record?.monitor,
      mucus: record?.mucus,
      bbt: record?.bbt ?? null,
      intercourse: record?.intercourse === true,
      status: statusByDay.get(day) ?? null,
    });
  }

  return {
    cycleId: cycle.id,
    cycleNo: cycle.cycleNo,
    day1: cycle.day1,
    open: cycle.closedAt === null,
    span,
    days,
    window: algorithmEnabled && result ? toStripWindow(result) : null,
  };
}

/** Closed cycle: engine length. Open/unknown: max(1, latest recorded day). */
function cycleSpan(result: CycleResult | undefined, records: DayRecordEntity[]): number {
  if (result && typeof result.length === "number" && result.length > 0) {
    return result.length;
  }
  let max = 1;
  for (const record of records) {
    if (record.dayInCycle > max) {
      max = record.dayInCycle;
    }
  }
  return max;
}

/** Public span resolver for cycle lists (selector labels). */
export function cycleSpanOf(result: CycleResult | undefined, records: DayRecordEntity[]): number {
  return cycleSpan(result, records);
}

/** `Cycle N · starts Jan 29, 2026 · 6 days (open)` — selector option label. */
export function cycleLabel(cycle: CycleEntity, span: number): string {
  const date = new Date(`${cycle.day1}T00:00:00Z`);
  const starts = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const open = cycle.closedAt === null ? " (open)" : "";
  return `Cycle ${cycle.cycleNo} · starts ${starts} · ${span} days${open}`;
}

function toStripWindow(result: CycleResult): StripWindow {
  return {
    begin: result.fertileWindow.begin,
    end: result.fertileWindow.end,
    beginRule: result.fertileWindow.beginRule,
    endRule: result.fertileWindow.endRule,
  };
}

/** BBT points for the right-axis line; null/blank days are dropped so the chart gaps. */
export function bbtSeries(days: StripDay[]): { day: number; bbt: number }[] {
  const out: { day: number; bbt: number }[] = [];
  for (const day of days) {
    if (day.bbt !== null && day.bbt !== undefined) {
      out.push({ day: day.day, bbt: day.bbt });
    }
  }
  return out;
}

/** Mucus marks; a stored explicit 'none' is user-signaled data and is kept. */
export function mucusSeries(days: StripDay[]): { day: number; level: MucusLevel }[] {
  const out: { day: number; level: MucusLevel }[] = [];
  for (const day of days) {
    if (day.mucus !== undefined) {
      out.push({ day: day.day, level: day.mucus });
    }
  }
  return out;
}

/** Intercourse markers; only true days. */
export function intercourseSeries(days: StripDay[]): { day: number }[] {
  const out: { day: number }[] = [];
  for (const day of days) {
    if (day.intercourse) {
      out.push({ day: day.day });
    }
  }
  return out;
}

/** Resolves the cycle to display: param match wins, else the newest cycle, else undefined. */
export function resolveSelectedCycle(
  cycles: CycleEntity[],
  param: string | undefined,
): CycleEntity | undefined {
  if (param) {
    const match = cycles.find((c) => c.id === param);
    if (match) {
      return match;
    }
  }
  return cycles.length > 0 ? cycles[cycles.length - 1] : undefined;
}

// --- Cycle comparison overlay ---

/**
 * Per-cycle color palette for the comparison chart. 8 distinguishable hues
 * that work in both light and dark themes. Cycles beyond 8 wrap around.
 */
export const CYCLE_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#f59e0b", // amber
] as const;

/** Opacity per monitor level within a cycle's color. */
export const MONITOR_OPACITIES: Record<string, number> = {
  none: 0.15,
  low: 0.35,
  high: 0.65,
  peak: 1.0,
};

/** One cycle's band at a given cycle day. */
export interface ComparisonBand {
  cycleId: string;
  cycleIndex: number;
  monitor?: MonitorReading;
}

/** One cycle day's worth of bands across all overlaid cycles. */
export interface ComparisonDayDatum {
  day: number;
  value: number;
  bands: ComparisonBand[];
}

/**
 * Builds the combined data array for the comparison chart from multiple
 * StripModels. Each entry holds one cycle day and the bands for every cycle
 * that has a reading on that day. Shorter cycles simply have no band on days
 * beyond their span, so the shared axis is never truncated.
 */
export function buildComparisonData(models: StripModel[]): ComparisonDayDatum[] {
  if (models.length === 0) {
    return [];
  }
  const maxSpan = maxSpanOf(models);
  const data: ComparisonDayDatum[] = [];
  for (let day = 1; day <= maxSpan; day++) {
    const bands: ComparisonBand[] = [];
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const stripDay = model.days[day - 1];
      if (stripDay) {
        bands.push({
          cycleId: model.cycleId,
          cycleIndex: i,
          monitor: stripDay.monitor,
        });
      }
    }
    data.push({ day, value: 1, bands });
  }
  return data;
}

/** The longest cycle span in the set, or 0 when empty. */
export function maxSpanOf(models: StripModel[]): number {
  let max = 0;
  for (const model of models) {
    if (model.span > max) {
      max = model.span;
    }
  }
  return max;
}

/** A region where two or more fertile windows overlap. */
export interface WindowOverlap {
  begin: number;
  end: number;
}

/**
 * Computes the regions where two or more fertile windows overlap.
 * Returns an array of { begin, end } ranges. Windows with a null end
 * (no Peak yet) are treated as extending to +infinity.
 */
export function computeWindowOverlaps(windows: StripWindow[]): WindowOverlap[] {
  if (windows.length < 2) {
    return [];
  }
  const boundaries: { day: number; delta: number }[] = [];
  for (const w of windows) {
    boundaries.push({ day: w.begin, delta: 1 });
    if (w.end !== null) {
      boundaries.push({ day: w.end + 1, delta: -1 });
    }
  }
  boundaries.sort((a, b) => a.day - b.day);
  const overlaps: WindowOverlap[] = [];
  let active = 0;
  let overlapStart: number | null = null;
  for (const b of boundaries) {
    const wasOverlap = active >= 2;
    active += b.delta;
    const isOverlap = active >= 2;
    if (!wasOverlap && isOverlap) {
      overlapStart = b.day;
    } else if (wasOverlap && !isOverlap && overlapStart !== null) {
      overlaps.push({ begin: overlapStart, end: b.day - 1 });
      overlapStart = null;
    }
  }
  return overlaps;
}
