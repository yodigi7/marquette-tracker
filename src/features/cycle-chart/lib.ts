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
 * Per-cycle color palette for the comparison chart. Twelve hues that work in
 * both light and dark themes, sized to the comparison view's maximum cycle
 * count so a full-size selection never has to repeat a colour.
 *
 * The order is load-bearing and is measured, not chosen by eye. The first six
 * are the ones on screen together at the default history window, so they are
 * spread to be distinguishable from *each other* — not merely from the entries
 * next to them — because six stacked rows are all visible against one another.
 * They were picked by exhaustive search over the candidate hues, maximising the
 * weakest pairwise CIEDE2000 distance. Every consecutive pair is far apart too,
 * so the rows directly above and below one another never read as the same.
 *
 * Colour is the redundant channel here: the monitor reading is already encoded
 * as block height and each row is labelled, so this set is a second cue rather
 * than the only way to read the chart. That is what makes twelve affordable.
 *
 * Beyond six, separation necessarily degrades — twelve mutually distinct hues do
 * not exist. See `colorDistance` in this file for the measurement the first six
 * are held to.
 */
export const CYCLE_COLORS = [
  "#14b8a6", // teal
  "#ef4444", // red
  "#84cc16", // lime
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#d946ef", // fuchsia
  // Second ring. Only reached past the default history window, where a weaker
  // separation is accepted rather than wrapping back onto a first-ring colour.
  "#22c55e", // green
  "#8b5cf6", // violet
  "#f97316", // orange
  "#0ea5e9", // sky
  "#ec4899", // pink
  "#06b6d4", // cyan
] as const;

/**
 * Weakest pairwise CIEDE2000 distance the first six entries are required to hold.
 *
 * Around 23-25 is where two colours become reliably tellable apart; the palette
 * above clears it with room. Enforced by test so a future edit that swaps in
 * two similar colours fails rather than shipping.
 */
export const MIN_FIRST_SIX_DISTANCE = 25;

/** How many palette entries are expected to be on screen together by default. */
export const FIRST_RING_SIZE = 6;

/**
 * The most cycles the comparison view's count control will select.
 *
 * Exported so the palette can be held to it: raising this without lengthening
 * `CYCLE_COLORS` would let a full-size selection wrap onto a repeated colour,
 * and the palette-size test reads this constant rather than a literal.
 */
export const MAX_COMPARISON_CYCLES = 12;

/**
 * Smallest perceptual difference between any two of the first `size` palette
 * entries, by CIEDE2000.
 *
 * Exists so "these colours are distinguishable" is a number a test can hold the
 * palette to, rather than a comment asserting it. Pure and dependency-free: the
 * palette is a fixed list of hex strings, so the general colour-management case
 * (ICC profiles, Lab constants other than D65) is not worth carrying.
 */
export function weakestPairDistance(colors: readonly string[], size: number): number {
  let weakest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      const d = colorDistance(colors[i], colors[j]);
      if (d < weakest) {
        weakest = d;
      }
    }
  }
  return weakest;
}

/** Smallest perceptual difference between any two adjacent palette entries. */
export function weakestAdjacentDistance(colors: readonly string[]): number {
  let weakest = Number.POSITIVE_INFINITY;
  for (let i = 0; i + 1 < colors.length; i++) {
    const d = colorDistance(colors[i], colors[i + 1]);
    if (d < weakest) {
      weakest = d;
    }
  }
  return weakest;
}

/** Perceptual colour difference between two hex strings, by CIEDE2000. */
export function colorDistance(hexA: string, hexB: string): number {
  const [l1, a1, b1] = hexToLab(hexA);
  const [l2, a2, b2] = hexToLab(hexB);

  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const meanC = (c1 + c2) / 2;
  const meanC7 = Math.pow(meanC, 7);
  const g = 0.5 * (1 - Math.sqrt(meanC7 / (meanC7 + Math.pow(25, 7))));

  const ap1 = (1 + g) * a1;
  const ap2 = (1 + g) * a2;
  const cp1 = Math.hypot(ap1, b1);
  const cp2 = Math.hypot(ap2, b2);

  const hp1 = hueDegrees(b1, ap1);
  const hp2 = hueDegrees(b2, ap2);

  const deltaL = l2 - l1;
  const deltaC = cp2 - cp1;

  let deltaHp = 0;
  if (cp1 * cp2 !== 0) {
    deltaHp = hp2 - hp1;
    if (deltaHp > 180) {
      deltaHp -= 360;
    } else if (deltaHp < -180) {
      deltaHp += 360;
    }
  }
  const bigDeltaHp = 2 * Math.sqrt(cp1 * cp2) * Math.sin((deltaHp * Math.PI) / 360);

  const meanL = (l1 + l2) / 2;
  const meanCp = (cp1 + cp2) / 2;

  let meanHp: number;
  if (cp1 * cp2 === 0) {
    meanHp = hp1 + hp2;
  } else if (Math.abs(hp1 - hp2) <= 180) {
    meanHp = (hp1 + hp2) / 2;
  } else if (hp1 + hp2 < 360) {
    meanHp = (hp1 + hp2 + 360) / 2;
  } else {
    meanHp = (hp1 + hp2 - 360) / 2;
  }

  const rad = Math.PI / 180;
  const t =
    1 -
    0.17 * Math.cos((meanHp - 30) * rad) +
    0.24 * Math.cos(2 * meanHp * rad) +
    0.32 * Math.cos((3 * meanHp + 6) * rad) -
    0.2 * Math.cos((4 * meanHp - 63) * rad);

  const deltaTheta = 30 * Math.exp(-Math.pow((meanHp - 275) / 25, 2));
  const meanCp7 = Math.pow(meanCp, 7);
  const rc = 2 * Math.sqrt(meanCp7 / (meanCp7 + Math.pow(25, 7)));

  const meanLShift = meanL - 50;
  const sl = 1 + (0.015 * meanLShift * meanLShift) / Math.sqrt(20 + meanLShift * meanLShift);
  const sc = 1 + 0.045 * meanCp;
  const sh = 1 + 0.015 * meanCp * t;
  const rt = -Math.sin(2 * deltaTheta * rad) * rc;

  const termL = deltaL / sl;
  const termC = deltaC / sc;
  const termH = bigDeltaHp / sh;
  return Math.sqrt(termL * termL + termC * termC + termH * termH + rt * termC * termH);
}

function hueDegrees(b: number, ap: number): number {
  if (b === 0 && ap === 0) {
    return 0;
  }
  const degrees = (Math.atan2(b, ap) * 180) / Math.PI;
  return degrees >= 0 ? degrees : degrees + 360;
}

/** sRGB hex to CIELAB under D65. */
function hexToLab(hex: string): [number, number, number] {
  const r = srgbToLinear(Number.parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(Number.parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(Number.parseInt(hex.slice(5, 7), 16) / 255);

  // sRGB -> XYZ, then normalised by the D65 white point.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;

  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function labPivot(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** Opacity per monitor level within a cycle's color. */
export const MONITOR_OPACITIES: Record<string, number> = {
  none: 0.15,
  low: 0.35,
  high: 0.65,
  peak: 1.0,
};

/**
 * A cycle's comparison colour, keyed by cycle id.
 *
 * The anchor is **all** logged cycles ordered newest first, not the cycles
 * currently selected for comparison. That is what makes a cycle's colour survive
 * every control that changes which cycles are shown — hiding one in the legend,
 * changing the count, hand-picking a set — because none of those change a
 * cycle's position among the logged set.
 *
 * Derived on read like every other value in this app; nothing is stored on the
 * cycle. Logging a new cycle does re-anchor the whole chart, which is accepted:
 * the comparison looks the same every time it is opened, and the hue carries
 * rank by recency rather than being an arbitrary label.
 */
export function comparisonColors(cycles: readonly { id: string }[]): Map<string, string> {
  const byCycleId = new Map<string, string>();
  const newestFirst = [...cycles].reverse();
  newestFirst.forEach((cycle, index) => {
    byCycleId.set(cycle.id, CYCLE_COLORS[index % CYCLE_COLORS.length]);
  });
  return byCycleId;
}

/**
 * The colour for a cycle id, falling back to the newest cycle's colour for a
 * cycle the map does not carry. Callers pass a subset of the logged set, so
 * every id is expected to resolve; the fallback keeps a missing entry from
 * rendering an undefined fill.
 */
export function colorForCycle(
  colorByCycleId: ReadonlyMap<string, string>,
  cycleId: string,
): string {
  return colorByCycleId.get(cycleId) ?? CYCLE_COLORS[0];
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
