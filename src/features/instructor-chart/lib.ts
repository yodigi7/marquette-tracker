import type { BeginRule, CycleResult, DateKey, EngineWarning } from "@/core/engine/types";
import type { DayRecordEntity } from "@/core/store/entities";

/**
 * The instructor chart's model: cycle days across, observations down, evidence beside every claim.
 *
 * Pure and DOM-free — no React, no router, no store, no clock. The view reads the clock and passes
 * today's date in. That is what makes the awkward parts testable: which rows a cycle earns, how a day
 * with no record renders, and what evidence a calendar-rule claim carries.
 */

/** The marker for a day that holds a record which carries nothing for the row in question. */
export const ABSENT = "—";

/**
 * The longest grid the chart will draw for one cycle.
 *
 * The protocol's own ceiling is 42 days. This is a deliberately looser cut, not a protocol rule: it only
 * stops an open cycle with no successor — which the engine bounds at today — from printing every day
 * between its Day 1 and now. Past this the cycle is already out of band and the app raises a warning, so
 * the honest thing is to cap the grid and let that warning speak.
 */
const HARD_MAX_CYCLE_DAYS = 60;

export const MONITOR_LABELS: Record<NonNullable<DayRecordEntity["monitor"]>, string> = {
  none: "No reading",
  low: "Low",
  high: "High",
  peak: "Peak",
};

export const MUCUS_LABELS: Record<NonNullable<DayRecordEntity["mucus"]>, string> = {
  none: "None",
  low: "Low",
  high: "High",
  peak: "Peak",
};

export const BLOOD_FLOW_LABELS: Record<NonNullable<DayRecordEntity["bloodFlow"]>, string> = {
  none: "",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

export const PREGNANCY_LABELS: Record<NonNullable<DayRecordEntity["pregnancyTest"]>, string> = {
  negative: "Negative",
  positive: "Positive",
};

export interface ChartCell {
  /** The value as a word, the absent marker, or the empty string for a day with no record. */
  text: string;
  /** True when nothing was recorded, so the grid can show a gap rather than a value. */
  empty: boolean;
  /** Window row only: true on a day the engine classifies fertile. */
  marked: boolean;
}

export interface ChartColumn {
  day: number;
  date: DateKey;
}

export interface ChartRow {
  id: string;
  label: string;
  cells: ChartCell[];
}

/** One lookback Peak day, annotated with whether the cycle is charted on this page. */
export interface ChartEvidence {
  cycleNo: number;
  peakDay: number;
  charted: boolean;
  /** "cycle 3 day 12 (charted on this page)" — the phrase, so wording is stated once. */
  phrase: string;
}

export interface ChartCycle {
  cycleId: string;
  cycleNo: number;
  day1: DateKey;
  isOpen: boolean;
  lengthLabel: string;
  peakLine: string;
  columns: ChartColumn[];
  rows: ChartRow[];
  beginDay: number;
  endDay: number | null;
  beginRule: BeginRule | null;
  beginNote: string | null;
  endNote: string | null;
  evidence: ChartEvidence[];
  evidenceNote: string | null;
  warningLines: string[];
  notes: string | null;
}

export interface InstructorChartModel {
  cycles: ChartCycle[];
  /** What the user asked for, which may exceed what exists. */
  requestedCycles: number;
  /** What the chart actually covers. */
  chartedCycles: number;
  /** Set when the request could not be met in full, so the shortfall is stated rather than implied. */
  notice: string | null;
}

export interface ChartInput {
  /** Every engine cycle result, oldest first. The most recent `cycleCount` are charted. */
  results: CycleResult[];
  records: DayRecordEntity[];
  algorithmEnabled: boolean;
  cycleCount: number;
}

/** The marker for a day that exists on the grid but holds no day record at all. */
export const NO_RECORD = "";

/** What a monitor cell says when the day holds no record. The row that carries readings says so in
 * words; every other row simply shows a gap, because "no record" there is not a statement about that
 * particular observation. */
export const NO_READING_LOGGED = "No reading logged";

/** An optional observation, and how to read it off a day record. */
interface OptionalRow {
  id: string;
  label: string;
  /** True when this day record carries a value for the row. */
  present: (record: DayRecordEntity) => boolean;
  /** The value as a word. Only called when `present` is true. */
  text: (record: DayRecordEntity) => string;
  /** Text for a day holding a record that carries nothing for this row. */
  emptyText?: string;
  /** Text for a day holding no record at all. */
  noRecordText?: string;
}

const OPTIONAL_ROWS: OptionalRow[] = [
  {
    id: "mucus",
    label: "Cervical mucus",
    present: (r) => r.mucus !== undefined,
    text: (r) => MUCUS_LABELS[r.mucus!],
  },
  {
    id: "bbt",
    label: "Temp",
    present: (r) => r.bbt !== undefined && r.bbt !== null,
    // Canonical-unit value, shown as stored. The display-unit preference belongs to the app, not the
    // chart, so a number on paper is never silently rescaled.
    text: (r) => String(r.bbt),
  },
  {
    id: "intercourse",
    label: "Intercourse",
    present: (r) => r.intercourse !== undefined,
    text: (r) => (r.intercourse ? "Yes" : "No"),
  },
  {
    id: "pregnancy",
    label: "Pregnancy test",
    present: (r) => r.pregnancyTest !== undefined,
    text: (r) => PREGNANCY_LABELS[r.pregnancyTest!],
  },
  {
    id: "symptoms",
    label: "Symptoms",
    present: (r) => r.symptoms !== undefined && r.symptoms.length > 0,
    text: (r) => (r.symptoms ?? []).join(", "),
  },
  {
    id: "notes",
    label: "Notes",
    present: (r) => r.notes !== undefined && r.notes !== "",
    text: (r) => r.notes ?? "",
  },
];

export function buildInstructorChartModel({
  results,
  records,
  algorithmEnabled,
  cycleCount,
}: ChartInput): InstructorChartModel {
  const requested = Math.max(1, Math.floor(cycleCount));
  const charted = results.slice(-requested);
  const chartedNos = new Set(charted.map((result) => result.cycleNo));

  const byCycle = new Map<string, DayRecordEntity[]>();
  for (const record of records) {
    const list = byCycle.get(record.cycleId);
    if (list) {
      list.push(record);
    } else {
      byCycle.set(record.cycleId, [record]);
    }
  }

  const cycles = charted.map((result) =>
    buildCycle({
      result,
      records: byCycle.get(result.cycleId) ?? [],
      algorithmEnabled,
      chartedNos,
    }),
  );

  const shortfall = charted.length < requested;
  return {
    cycles,
    requestedCycles: requested,
    chartedCycles: charted.length,
    notice: shortfall
      ? `Charting ${charted.length} of ${requested} cycles requested — only ${charted.length} exist${
          charted.length === 1 ? "" : "s"
        }.`
      : null,
  };
}

function buildCycle({
  result,
  records,
  algorithmEnabled,
  chartedNos,
}: {
  result: CycleResult;
  records: DayRecordEntity[];
  algorithmEnabled: boolean;
  chartedNos: Set<number>;
}): ChartCycle {
  const byDate = new Map(records.map((record) => [record.date, record]));

  // The engine bounds an open cycle at `today`, so with no successor its `days` can run far past the
  // cycle a person would call it. A chart column is one cycle day the reader can see, so a cycle longer
  // than the protocol band is cut at the band rather than printing hundreds of empty columns. This only
  // ever shortens a grid the app itself already flags as out of band; it never moves a window boundary.
  const cycleDays = result.days.slice(0, HARD_MAX_CYCLE_DAYS);
  const columns = cycleDays.map((day) => ({ day: day.day, date: day.date }));

  const cellsFor = (pick: (record: DayRecordEntity) => string, config?: OptionalRow) =>
    columns.map((column) => {
      const record = byDate.get(column.date);
      if (!record) {
        return {
          text: config?.noRecordText ?? NO_RECORD,
          empty: true,
          marked: false,
        };
      }
      const text = pick(record);
      const shown = text === "" ? (config?.emptyText ?? ABSENT) : text;
      return { text: shown, empty: text === "", marked: false };
    });

  const rows: ChartRow[] = [
    {
      id: "date",
      label: "Date",
      cells: columns.map((column) => ({ text: column.date, empty: false, marked: false })),
    },
    {
      id: "menses",
      label: "Menses",
      cells: cellsFor((record) => BLOOD_FLOW_LABELS[record.bloodFlow ?? "none"] ?? ABSENT),
    },
    {
      // The row that carries readings states an unlogged day in words, because "no reading" is a
      // statement about the monitor and not merely a gap in the grid.
      id: "monitor",
      label: "Monitor",
      cells: cellsFor(
        (record) => (record.monitor === undefined ? "" : MONITOR_LABELS[record.monitor]),
        {
          id: "monitor",
          label: "Monitor",
          present: () => true,
          text: () => "",
          noRecordText: NO_READING_LOGGED,
        },
      ),
    },
  ];

  // The engine names the fields `begin`/`end`; the chart renames to `…Day` so a reader-facing value is
  // never confusable with a rule id sitting next to it.
  const { begin: beginDay, end: endDay, beginRule } = result.fertileWindow;
  // A cycle can hold more than one monitor Peak, so the chart names the last and the count rather than
  // implying a single one. Counted from records, not inferred from the window.
  const peakCount = records.filter((record) => record.monitor === "peak").length;

  if (algorithmEnabled) {
    // The band is a filled cell, not a colour, so it survives black and white. A day with no record is
    // still marked: the engine classifies every day of the cycle, logged or not.
    rows.push({
      id: "window",
      label: "Fertile window",
      cells: cycleDays.map((day) => ({
        text: "",
        empty: true,
        marked: day.status === "fertile",
      })),
    });
  }

  // Scoped per cycle, not per run. A row on a cycle that holds nothing reads as missing data rather
  // than as absence, which is the opposite of what an empty cell means.
  for (const optional of OPTIONAL_ROWS) {
    if (!records.some(optional.present)) {
      continue;
    }
    rows.push({
      id: optional.id,
      label: optional.label,
      cells: cellsFor((record) => (optional.present(record) ? optional.text(record) : "")),
    });
  }

  const { beginNote, evidence, evidenceNote } = algorithmEnabled
    ? describeBegin(result, chartedNos)
    : { beginNote: null, evidence: [] as ChartEvidence[], evidenceNote: null };

  return {
    cycleId: result.cycleId,
    cycleNo: result.cycleNo,
    day1: result.day1,
    isOpen: result.length === null,
    lengthLabel:
      result.length === null ? "In progress — length not yet known" : `${result.length} days`,
    peakLine: peakLine(result, peakCount),
    columns,
    rows,
    beginDay,
    endDay,
    beginRule,
    beginNote,
    endNote:
      endDay === null
        ? "No end determined — the protocol sets the end from a Peak in this cycle, and it has none."
        : null,
    evidence,
    evidenceNote,
    warningLines: algorithmEnabled ? warningLines(result.warnings) : [],
    notes: records
      .filter((record) => record.notes !== undefined && record.notes !== "")
      .map((record) => `Day ${record.dayInCycle}: ${record.notes}`)
      .join("\n"),
  };
}

/**
 * What a window-begin claim is standing on, in the words a reader can check against the grid.
 *
 * The point of the whole document: a begin that names a rule also names the numbers behind it. Where
 * the evidence lives in a cycle this page does not chart, the line says so rather than leaving a claim
 * the reader has no way to test.
 */
function describeBegin(
  result: CycleResult,
  chartedNos: Set<number>,
): { beginNote: string | null; evidence: ChartEvidence[]; evidenceNote: string | null } {
  const { beginRule, begin } = result.fertileWindow;

  if (beginRule === "first-high-or-peak") {
    return {
      beginNote: `Opened on a recorded reading — day ${begin}, the first High or Peak logged this cycle.`,
      evidence: [],
      evidenceNote: null,
    };
  }

  if (beginRule === "calendar-day-6") {
    return {
      beginNote: `Opens on cycle day 6 — the calendar rule for the first six cycles.`,
      evidence: [],
      evidenceNote: null,
    };
  }

  if (beginRule === "calendar-day-6-fallback") {
    return {
      beginNote: `Opens on cycle day 6 — the history window held no Peak to measure from, so the app fell back to the day-6 rule.`,
      evidence: [],
      evidenceNote:
        "No monitor Peak was available for the calendar rule to use, so no Peak day is claimed here.",
    };
  }

  // calendar-earliest-peak-minus-6: the rule that consumes the lookback window.
  const evidence: ChartEvidence[] = result.lookbackPeaks.map((peak) => {
    const charted = chartedNos.has(peak.cycleNo);
    return {
      cycleNo: peak.cycleNo,
      peakDay: peak.peakDay,
      charted,
      phrase: `cycle ${peak.cycleNo} day ${peak.peakDay}${
        charted ? " (charted on this page)" : " (not on this chart)"
      }`,
    };
  });
  const earliest = evidence.reduce<ChartEvidence | null>(
    (best, entry) => (best === null || entry.peakDay < best.peakDay ? entry : best),
    null,
  );

  // The headline names the rule and the one number it turned on. The full list of contributing Peaks is
  // carried as `evidence` and rendered on its own line, so a surface can place it — and so the wording
  // of "which cycles are on this page" is stated once, here, rather than in two places.
  const head =
    earliest === null
      ? "Opened by the calendar rule — no monitor Peak was available for it to use."
      : `Opened by the calendar rule — earliest Peak day ${earliest.peakDay}, cycle ${earliest.cycleNo}.`;

  return {
    beginNote: head,
    evidence,
    evidenceNote: null,
  };
}

/**
 * The cycle's Peak day, and the reading its window end came from.
 *
 * A monitor shows Peak for a minimum of two days, so naming one day as the whole story hides the
 * reading the end was measured from. The first reading is the Peak day the calendar rule is derived
 * from; the last is the anchor. A single-reading cycle needs no second clause.
 */
function peakLine(result: CycleResult, peakCount: number): string {
  const { firstPeakDay, lastPeakDay } = result;
  if (firstPeakDay === null) {
    return "No monitor Peak recorded in this cycle";
  }
  if (firstPeakDay === lastPeakDay || peakCount <= 1) {
    return `Peak day ${firstPeakDay}`;
  }
  return (
    `Peak day ${firstPeakDay} — the first of ${peakCount} monitor Peak readings in this cycle. ` +
    `The window ends three full days after the last of them, on day ${lastPeakDay}`
  );
}

/** The engine's own warnings, in plain language. Never invented, never re-derived. */
function warningLines(warnings: EngineWarning[]): string[] {
  const lines: string[] = [];
  for (const warning of warnings) {
    switch (warning.kind) {
      case "no-peak-end":
        lines.push(
          "No monitor Peak in this cycle, so the protocol sets no end for the fertile window.",
        );
        break;
      case "monitor-evidence-outside-window":
        lines.push(
          `A monitor reading on day ${warning.day} falls after the computed window end. The window was not changed.`,
        );
        break;
      case "cycle-out-of-band":
        lines.push(`Cycle length ${warning.length} days is outside the protocol band.`);
        break;
      case "open-cycle-past-window-end":
        lines.push(
          "This cycle is still in progress and has passed its computed window end, so the days after it are not settled.",
        );
        break;
      case "high-run":
        lines.push(
          `A run of ${warning.run} consecutive High readings — the monitor's own guidance is to stop testing at this point.`,
        );
        break;
    }
  }
  return lines;
}
