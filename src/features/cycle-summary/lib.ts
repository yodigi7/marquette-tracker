import type {
  BeginRule,
  BloodFlow,
  CycleResult,
  DateKey,
  EngineWarning,
  EndRule,
  MonitorReading,
  MucusLevel,
  PregnancyResult,
} from "@/core/engine/types";
import type { DayRecordEntity } from "@/core/store/entities";
import { BEGIN_RULE_LABELS, endRuleLabel, warningBanner } from "@/features/status/lib";

/**
 * The cycle summary: a single-cycle document for a person to read, produced by printing.
 *
 * Everything here is existing derived output or a logged record, restated. No value is computed that
 * the engine does not already compute, and nothing is stored. The engine is untouched — see
 * `openspec/changes/instructor-cycle-summary/design.md`.
 *
 * The rule and warning wording is imported from the Status view's vocabulary rather than restated, so
 * the document cannot describe the window differently from the app that computed it.
 */

/** The protocol band the engine was configured with, quoted when a length falls outside it. */
export interface ProtocolBand {
  min: number;
  max: number;
}

/** One cycle day. A `null` field means the value was not recorded, never a computed default. */
export interface SummaryDay {
  day: number;
  date: DateKey;
  /** `null` covers both no Day Record and a stored `none`: the CBPM's "no reading". */
  monitor: MonitorReading | null;
  bloodFlow: BloodFlow | null;
  mucus: MucusLevel | null;
  bbt: number | null;
  intercourse: boolean;
  pregnancyTest: PregnancyResult | null;
  symptoms: string[];
  notes: string | null;
  /** True when the cycle holds no Day Record at all for this day. */
  unlogged: boolean;
}

/**
 * Which optional columns the document shows. Each turns on only where the cycle actually holds the
 * value, so a lightly logged cycle stays a narrow sheet rather than a grid of empty cells.
 */
export interface SummaryColumns {
  menses: boolean;
  mucus: boolean;
  bbt: boolean;
  intercourse: boolean;
  pregnancyTest: boolean;
  symptoms: boolean;
  notes: boolean;
}

/** The computed window, with the plain-language basis of each end beside the rule that produced it. */
export interface SummaryWindow {
  begin: number;
  end: number | null;
  /** Inclusive fertile days, or null when there is no end to count to. */
  days: number | null;
  beginBasis: string;
  beginRule: string;
  endBasis: string;
  endRule: string;
}

export interface SummaryModel {
  cycleNo: number;
  day1: DateKey;
  firstDay: number;
  lastDay: number;
  open: boolean;
  length: number | null;
  /** The cycle's Peak day: its first monitor Peak reading. Null when the cycle holds none. */
  firstPeakDay: number | null;
  /** The cycle's last monitor Peak reading, the one the window end is measured from. */
  lastPeakDay: number | null;
  /** Monitor Peak readings logged in this cycle. */
  peakCount: number;
  window: SummaryWindow | null;
  days: SummaryDay[];
  columns: SummaryColumns;
  /** One plain-language line per protocol warning the app raised for this cycle. */
  warnings: string[];
}

export interface SummaryInput {
  result: CycleResult;
  /** This cycle's Day Records, in any order. */
  records: DayRecordEntity[];
  /** Warnings for this cycle only — see `design.md` Decision 4 for which list to filter. */
  warnings: EngineWarning[];
  band: ProtocolBand;
  algorithmEnabled: boolean;
}

export function buildSummaryModel({
  result,
  records,
  warnings,
  band,
  algorithmEnabled,
}: SummaryInput): SummaryModel {
  const byDay = new Map<number, DayRecordEntity>();
  for (const record of records) {
    byDay.set(record.dayInCycle, record);
  }

  const days: SummaryDay[] = result.days.map((entry) => {
    const record = byDay.get(entry.day);
    return {
      day: entry.day,
      date: entry.date,
      monitor: loggedMonitor(record),
      bloodFlow: record?.bloodFlow ?? null,
      mucus: record?.mucus ?? null,
      bbt: record?.bbt ?? null,
      intercourse: record?.intercourse === true,
      pregnancyTest: record?.pregnancyTest ?? null,
      symptoms: record?.symptoms ?? [],
      notes: record?.notes ?? null,
      unlogged: record === undefined,
    };
  });

  const peakCount = records.filter((record) => record.monitor === "peak").length;

  return {
    cycleNo: result.cycleNo,
    day1: result.day1,
    firstDay: result.days[0]?.day ?? 1,
    lastDay: result.days[result.days.length - 1]?.day ?? 0,
    open: result.length === null,
    length: result.length,
    firstPeakDay: algorithmEnabled ? result.firstPeakDay : null,
    lastPeakDay: algorithmEnabled ? result.lastPeakDay : null,
    peakCount,
    window: algorithmEnabled ? buildWindow(result) : null,
    days,
    columns: {
      menses: days.some((entry) => entry.bloodFlow !== null),
      mucus: days.some((entry) => entry.mucus !== null),
      bbt: days.some((entry) => entry.bbt !== null),
      intercourse: days.some((entry) => entry.intercourse),
      pregnancyTest: days.some((entry) => entry.pregnancyTest !== null),
      symptoms: days.some((entry) => entry.symptoms.length > 0),
      notes: days.some((entry) => entry.notes !== null && entry.notes !== ""),
    },
    warnings: algorithmEnabled
      ? warningLines(warnings, { windowEnd: result.fertileWindow.end, band })
      : [],
  };
}

/**
 * A stored `none` is the monitor's "no reading" and must not print as a reading. Other values are the
 * user's own entries. A mucus `none` is left alone — that field records a deliberate observation.
 */
function loggedMonitor(record: DayRecordEntity | undefined): MonitorReading | null {
  if (!record || record.monitor === undefined || record.monitor === "none") {
    return null;
  }
  return record.monitor;
}

function buildWindow(result: CycleResult): SummaryWindow {
  const window = result.fertileWindow;
  const basis = windowBasis(window, result.lastPeakDay);
  return {
    begin: window.begin,
    end: window.end,
    days: window.end === null ? null : window.end - window.begin + 1,
    beginBasis: basis.begin,
    beginRule: BEGIN_RULE_LABELS[window.beginRule],
    endBasis: basis.end,
    endRule: endRuleLabel(window.endRule),
  };
}

// --- Window basis ---

/**
 * Whether each end of the window came from the calendar rule or from a reading the user logged.
 *
 * The two things the requirement asks the document to make explicit, stated as a category. The exact
 * rule is printed separately, from the Status view's own rule labels, so precision is not restated here.
 *
 * `calendar-day-6` and `calendar-day-6-fallback` deliberately share one sentence: they are the same
 * rule and the same day, reached two different ways, and the difference between them is *why* the
 * calendar rule had nothing to measure from — which the rule label beside this already says.
 *
 * A `Record` over the engine's unions rather than a `switch`: a rule value added to the engine becomes
 * a type error here instead of silently rendering a blank basis.
 */
const BEGIN_BASIS: Record<BeginRule, string> = {
  "calendar-day-6": "Set by the calendar rule, not by a reading.",
  "calendar-day-6-fallback": "Set by the calendar rule, not by a reading.",
  "calendar-earliest-peak-minus-6": "Set by the calendar rule, not by a reading.",
  "first-high-or-peak": "Set by your own reading — the first High or Peak of this cycle.",
};

// Measured from the cycle's *last* Peak reading, which is the reading the end rule is defined
// through — not from the cycle's Peak day, which is its first reading.
const END_BASIS: Record<EndRule, (lastPeakDay: number | null) => string> = {
  "current-peak-plus-n": (lastPeakDay) =>
    `Set by your own reading — three full days after the monitor Peak you recorded on cycle day ${lastPeakDay}.`,
  "lookback-latest-peak-plus-n": () =>
    "Set by the Peaks in your recent cycles — three full days after the latest of them.",
  "protocol-fallback-window": () =>
    "Set by the protocol's earliest possible Peak day — three full days after it, because no Peak readings are on record to derive a window from.",
  none: () =>
    "No end can be set. The protocol ends the fertile window three full days after a monitor Peak reading, and this cycle has none.",
};

export interface WindowBasis {
  begin: string;
  end: string;
}

export function windowBasis(
  window: { beginRule: BeginRule; endRule: EndRule },
  lastPeakDay: number | null,
): WindowBasis {
  return {
    begin: BEGIN_BASIS[window.beginRule],
    end: END_BASIS[window.endRule](lastPeakDay),
  };
}

// --- Protocol warnings ---

export interface WarningContext {
  /** The window end, which the engine deliberately leaves to the caller to look up. */
  windowEnd: number | null;
  band: ProtocolBand;
}

/**
 * One plain-language line per warning the app raised for this cycle.
 *
 * The two reconciliation kinds reuse `warningBanner` so the document says exactly what the Status view
 * says about the same contradiction. The other three have no wording in the Status vocabulary, which
 * is narrowed to the kinds it reconciles on a date-selectable view, so they are phrased here.
 *
 * The document reports the warnings the app raised and raises none of its own — so an out-of-band line
 * appears only when the engine raised one, which it does only once at least two cycles are out of band.
 */
export function warningLines(
  warnings: EngineWarning[],
  { windowEnd, band }: WarningContext,
): string[] {
  const lines: string[] = [];
  for (const warning of warnings) {
    if (
      warning.kind === "monitor-evidence-outside-window" ||
      warning.kind === "open-cycle-past-window-end"
    ) {
      // A one-element array, so this returns the line for this warning rather than the most relevant
      // of several — the document lists all of them.
      const line = warningBanner([warning], windowEnd);
      if (line !== null) {
        lines.push(line);
      }
      continue;
    }
    if (warning.kind === "no-peak-end") {
      lines.push(
        "No monitor Peak reading in this cycle. The protocol ends the fertile window three full days after a Peak reading, so no end can be set for this cycle.",
      );
      continue;
    }
    if (warning.kind === "high-run") {
      // Names the run and its length, and says plainly that it is not a Peak reading — a document
      // handed to an instructor must not let a run of Highs be read as evidence of one.
      lines.push(
        `Monitor High on ${warning.run} consecutive cycle days of this cycle, which is the point at which the monitor's guidance is to stop testing. No Peak is recorded from these days.`,
      );
      continue;
    }
    // `cycle-out-of-band`. The engine only raises this once at least two cycles are outside the band,
    // so its presence is itself that fact — the count itself lives on EngineOutput, not per cycle.
    lines.push(
      `This cycle ran ${warning.length} days, outside the ${band.min}–${band.max} day band the protocol is designed for. At least two of your cycles have fallen outside that band — consider consulting a Marquette-certified instructor.`,
    );
  }
  return lines;
}

// --- Header lines ---

/** No value logged for a field. */
export const ABSENT = "—";

/** No monitor reading was logged that morning. */
export const NO_READING = "No reading logged";

export const MONITOR_LABELS: Record<MonitorReading, string> = {
  none: "None",
  low: "Low",
  high: "High",
  peak: "Peak",
};

export const MUCUS_LABELS: Record<MucusLevel, string> = {
  none: "None",
  low: "Low",
  high: "High",
  peak: "Peak",
};

export const BLOOD_FLOW_LABELS: Record<BloodFlow, string> = {
  none: "None",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

export const PREGNANCY_LABELS: Record<PregnancyResult, string> = {
  negative: "Negative",
  positive: "Positive",
};

export function dayRangeLine(firstDay: number, lastDay: number): string {
  if (lastDay < firstDay) {
    return "No cycle days recorded";
  }
  return firstDay === lastDay ? `Cycle day ${firstDay}` : `Cycle days ${firstDay} to ${lastDay}`;
}

/**
 * Length, or the honest absence of it. An unfinished cycle states the day it has reached and says the
 * length is not known, rather than printing the elapsed days where a length belongs.
 */
export function lengthLine(length: number | null, lastDay: number): string {
  if (length === null) {
    return `In progress — cycle day ${lastDay} so far. The length of this cycle is not known until it closes.`;
  }
  return `${length} ${length === 1 ? "day" : "days"}`;
}

/**
 * The cycle's Peak reading, and how many the cycle holds. A cycle can hold more than one and the window
 * end is measured from the latest, so a document that named one reading without saying how many would
 * let a reader assume the wrong one produced the window.
 *
 * Both readings are named with the job each one has. The first reading is the cycle's Peak day — the
 * day the surge started, and the value the calendar rule is derived from — while the last is what the
 * window end is measured from. A single-reading cycle is its own Peak day and needs no second clause.
 */
export function peakLine(
  firstPeakDay: number | null,
  lastPeakDay: number | null,
  peakCount: number,
): string {
  if (firstPeakDay === null) {
    return "No monitor Peak reading recorded in this cycle.";
  }
  if (firstPeakDay === lastPeakDay) {
    return `Monitor Peak on cycle day ${firstPeakDay}.`;
  }
  return (
    `Monitor Peak on cycle day ${firstPeakDay} — the first of ${peakCount} monitor Peak readings ` +
    `in this cycle. The fertile window ends three full days after the last of them, on cycle day ` +
    `${lastPeakDay}.`
  );
}

/** The document is a snapshot, and says when it was taken. */
export function snapshotLine(generatedOn: DateKey): string {
  return `Snapshot generated ${generatedOn}. This is a fixed record of what was logged and derived at that moment, and it does not update.`;
}

/** What the document deliberately leaves out, so its absence is accounted for. */
export function exclusionsNote(): string {
  return "Predictions and projected future cycles are not included in this document.";
}

/** Why the derived half is missing when interpretation is off. */
export function algorithmOffNote(): string {
  return "Algorithm is off — readings are logged but not interpreted. This document shows the raw log only: no fertile window, no Peak day, and no protocol notes.";
}
