import type { BeginRule, CycleResult, DateKey, EngineWarning } from "@/core/engine/types";
import type { DayRecordEntity } from "@/core/store/entities";
import { FERTILITY_CHART_TINTS } from "@/lib/fertility-visuals";

/**
 * The instructor chart's model: cycle days across, observations down, evidence beside every claim.
 *
 * Pure and DOM-free — no React, no router, no store, no clock. The view reads the clock and passes
 * today's date in. That is what makes the awkward parts testable: which rows a cycle earns, how a day
 * with no record renders, and what evidence a calendar-rule claim carries.
 */

/**
 * The mark for a day that exists in the grid and holds nothing for the row in question.
 *
 * One character, like every other mark, and deliberately not `-`: a test result legitimately prints `-`
 * for negative, and the absence mark appears in every row, so it is the one that must not be ambiguous.
 * A middot is inside the typeface's covered range, is the quietest mark available, and sits on the centre
 * line where a cell's content sits, rather than on the baseline where punctuation sits.
 *
 * The gap against a day with no record at all — the blank — is the point: this says "logged, and the field
 * was empty", that says "nothing was logged here".
 */
export const ABSENT = "·";

/**
 * The longest grid the chart will draw for one cycle.
 *
 * The protocol's own ceiling is 42 days. This is a deliberately looser cut, not a protocol rule: it only
 * stops an open cycle with no successor — which the engine bounds at today — from printing every day
 * between its Day 1 and now. Past this the cycle is already out of band and the app raises a warning, so
 * the honest thing is to cap the grid and let that warning speak.
 */
const HARD_MAX_CYCLE_DAYS = 60;

/**
 * The characters a cell prints.
 *
 * One character per mark, because a cycle day is a column a person scans down, and a word per cell makes
 * the widest value in a row set the width of every column in it. Every mark below is ASCII or inside
 * `U+2000-206F`, which is the whole of what the app's subsetted typeface covers — so the sheet is one
 * typeface at one optical size, and no mark silently falls back to a system font.
 */

/** A monitor or mucus reading the app can actually hold. See `storedReading`. */
export type StoredReading = "low" | "high" | "peak";

/** A menses flow the app can actually hold. */
export type StoredFlow = "light" | "medium" | "heavy";

export const MONITOR_MARKS: Record<StoredReading, string> = { low: "L", high: "H", peak: "P" };

export const MUCUS_MARKS: Record<StoredReading, string> = { low: "L", high: "H", peak: "P" };

export const MENES_MARKS: Record<StoredFlow, string> = { light: "1", medium: "2", heavy: "3" };

export const PREGNANCY_MARKS: Record<NonNullable<DayRecordEntity["pregnancyTest"]>, string> = {
  negative: "-",
  positive: "+",
};

/** Intercourse, the standing convention on these charts and one character like every other mark. */
export const INTERCOURSE_MARK = "X";

/**
 * What each character a row prints stands for.
 *
 * One map per row, and the only place a mark is paired with its meaning. The printed legend and every
 * cell's spoken value are both read off these, so a key cannot drift from the grid it explains and a cell
 * cannot claim a meaning the legend does not carry.
 */
const PHRASES: Record<string, Phrases> = {
  // Each reading carries the tint the app already paints that reading with on the Calendar, so a mark
  // means the same thing in the same colour wherever the reader meets it.
  monitor: {
    L: { meaning: "low", tint: FERTILITY_CHART_TINTS.monitorLow },
    H: { meaning: "high", tint: FERTILITY_CHART_TINTS.monitorHigh },
    P: { meaning: "peak", tint: FERTILITY_CHART_TINTS.monitorPeak },
    [ABSENT]: { meaning: "monitor not used", tint: "" },
  },
  menses: {
    "1": { meaning: "light", tint: FERTILITY_CHART_TINTS.menses },
    "2": { meaning: "medium", tint: FERTILITY_CHART_TINTS.menses },
    "3": { meaning: "heavy", tint: FERTILITY_CHART_TINTS.menses },
    [ABSENT]: { meaning: "nothing recorded", tint: "" },
  },
  mucus: {
    L: { meaning: "low", tint: FERTILITY_CHART_TINTS.monitorLow },
    H: { meaning: "high", tint: FERTILITY_CHART_TINTS.monitorHigh },
    P: { meaning: "peak", tint: FERTILITY_CHART_TINTS.monitorPeak },
    [ABSENT]: { meaning: "nothing recorded", tint: "" },
  },
  intercourse: {
    [INTERCOURSE_MARK]: { meaning: "yes", tint: "" },
    [ABSENT]: { meaning: "no", tint: "" },
  },
  pregnancy: {
    "+": { meaning: "positive", tint: "" },
    "-": { meaning: "negative", tint: "" },
  },
  bbt: { [ABSENT]: { meaning: "nothing recorded", tint: "" } },
};

/**
 * What the absence mark says, for the legend.
 *
 * It is the one mark every row shares, and it is also how an unmarked cell looks, so the key describes it
 * once for the sheet rather than repeating it against every row's other characters.
 */
const ABSENT_MEANING = "logged, nothing recorded";

/**
 * The reading a record actually holds, or `undefined` if it holds none.
 *
 * `"none"` is an option the entry dialog offers and then normalises away before saving, so it never
 * reaches a record. It is named in the type, though, so reading it as a stored value would be a lie the
 * grid then printed. Both `"none"` and absent are "not used" here, and the chart says so with one mark.
 */
function storedReading(value: DayRecordEntity["monitor"]): StoredReading | undefined {
  return value === "low" || value === "high" || value === "peak" ? value : undefined;
}

/** The menses flow a record actually holds, or `undefined` if it holds none. */
function storedFlow(value: DayRecordEntity["bloodFlow"]): StoredFlow | undefined {
  return value === "light" || value === "medium" || value === "heavy" ? value : undefined;
}

/** What one character of a row means, and the tint its cell carries. */
export interface ChartPhrase {
  meaning: string;
  /** A class the document applies to the cell. Empty when the cell needs no tint. */
  tint: string;
}

/** What a row's characters mean. See `PHRASES`. */
export type Phrases = Record<string, ChartPhrase>;

export interface ChartCell {
  /** The mark as printed: a character, the absence mark, or the empty string for a day with no record. */
  text: string;
  /**
   * What the mark stands for, in words, for assistive technology.
   *
   * A character on its own is unreadable without the key, and a screen-reader user should not have to
   * find the legend to learn that `L` means low. The table's row headers already name the observation, so
   * this carries only the value, and the two together read as "Monitor, low". Empty where there is
   * nothing to announce: a blank cell, and the date row, whose mark is already a date.
   */
  spoken: string;
  /** A class the document applies to tint the cell. Empty when the cell needs none. */
  tint: string;
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
  /** What this row's characters stand for. The source for both the legend and every cell's `spoken`. */
  phrases: Phrases;
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
  evidenceLine: string | null;
  evidenceNote: string | null;
  warningLines: string[];
  /**
   * What the cycle holds that does not fit a grid cell — symptoms and notes, one line per cycle day.
   *
   * These leave the grid because their length is unbounded, and a single long note would otherwise set
   * the width of every day column in the cycle. Empty when the cycle holds neither.
   */
  detailLines: string[];
  /** The key for the marks this cycle's grid uses. Derived from `rows`, never declared beside them. */
  legend: ChartLegendEntry[];
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

/**
 * A stored date as the chart prints it: month and day, no year, no leading zero.
 *
 * The full date was the widest cell in a typical cycle, so under the grid's own column sizing it set the
 * width of every day column and pushed the back half of the cycle off the page. The year is not lost —
 * each cycle prints its Day 1 in full on its own heading, and a run only crosses a year boundary inside a
 * single cycle.
 *
 * The key is split rather than parsed into a `Date`, so the format cannot be moved by a timezone and the
 * model stays free of any browser API.
 */
export function shortDate(date: DateKey): string {
  // The year is dropped rather than parsed away, so there is nothing for a timezone to disagree about.
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** An optional observation, and how to read it off a day record. */
interface OptionalRow {
  id: string;
  label: string;
  /** What this row's characters stand for. See `PHRASES`. */
  phrases: Phrases;
  /** True when this day record carries a value for the row. */
  present: (record: DayRecordEntity) => boolean;
  /** The value as a mark. Only called when `present` is true. */
  text: (record: DayRecordEntity) => string;
}

const OPTIONAL_ROWS: OptionalRow[] = [
  {
    id: "mucus",
    phrases: PHRASES.mucus,
    label: "Mucus",
    present: (r) => storedReading(r.mucus) !== undefined,
    text: (r) => MUCUS_MARKS[storedReading(r.mucus)!],
  },
  {
    id: "bbt",
    phrases: PHRASES.bbt,
    label: "Temp",
    present: (r) => r.bbt !== undefined && r.bbt !== null,
    // Canonical-unit value, shown as stored. The display-unit preference belongs to the app, not the
    // chart, so a number on paper is never silently rescaled.
    text: (r) => String(r.bbt),
  },
  {
    id: "intercourse",
    phrases: PHRASES.intercourse,
    label: "Intercourse",
    present: (r) => r.intercourse !== undefined,
    // An empty string means "asked and answered no", which `cellsFor` renders as the absence mark.
    text: (r) => (r.intercourse ? INTERCOURSE_MARK : ""),
  },
  {
    id: "pregnancy",
    phrases: PHRASES.pregnancy,
    label: "Test",
    present: (r) => r.pregnancyTest !== undefined,
    text: (r) => PREGNANCY_MARKS[r.pregnancyTest!],
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

/** One line of the printed legend: the character a cell shows, and what it stands for. */
export interface ChartLegendEntry {
  mark: string;
  meaning: string;
}

/**
 * The legend for the rows this cycle actually carries.
 *
 * Read off the rows' own phrase maps, so the key is generated from the same source as the cells it
 * explains and cannot disagree with them. A row that is not on the grid contributes no key, so a run
 * with no pregnancy test never claims one.
 */
function legendFor(rows: ChartRow[]): ChartLegendEntry[] {
  const entries: ChartLegendEntry[] = [];
  const has = (id: string) => rows.some((row) => row.id === id);

  for (const id of ["monitor", "menses", "mucus", "intercourse", "pregnancy", "bbt"] as const) {
    if (!has(id)) continue;
    const row = rows.find((item) => item.id === id)!;
    for (const [mark, meaning] of Object.entries(row.phrases)) {
      if (mark === ABSENT) continue;
      entries.push({ mark, meaning: `${row.label} ${meaning.meaning}` });
    }
  }
  if (has("window")) {
    // The band is a filled cell rather than a character, so it is described rather than spelled out.
    entries.push({ mark: "", meaning: "shaded: fertile window" });
  }
  entries.push({ mark: ABSENT, meaning: ABSENT_MEANING });
  return entries;
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

  // Two absences, and they mean different things: a day with no record at all is blank, because nothing
  // was logged for it, while a day that was logged without a value for this row carries the mark. Every
  // row on the sheet follows this one rule, the monitor row included.
  const cellsFor = (pick: (record: DayRecordEntity) => string, phrases: Phrases) =>
    columns.map((column) => {
      const record = byDate.get(column.date);
      if (!record) {
        return { text: NO_RECORD, spoken: "", tint: "", empty: true, marked: false };
      }
      const text = pick(record);
      const shown = text === "" ? ABSENT : text;
      const phrase = phrases[shown];
      return {
        text: shown,
        spoken: phrase?.meaning ?? "",
        tint: phrase?.tint ?? "",
        empty: text === "",
        marked: false,
      };
    });

  const rows: ChartRow[] = [
    {
      id: "date",
      label: "Date",
      phrases: {},
      // A date is already readable as itself, so it carries no spoken value and no tint of its own.
      cells: columns.map((column) => ({
        text: shortDate(column.date),
        spoken: "",
        tint: "",
        empty: false,
        marked: false,
      })),
    },
    {
      id: "menses",
      label: "Menses",
      phrases: PHRASES.menses,
      cells: cellsFor((record) => {
        const flow = storedFlow(record.bloodFlow);
        return flow === undefined ? "" : MENES_MARKS[flow];
      }, PHRASES.menses),
    },
    {
      // The monitor row is an ordinary row: a day with no record is blank, and a day that was logged
      // without a reading carries the absence mark. That keeps one rule for every row on the sheet — a
      // blank means nothing was logged, a mark means something was — which is the only way a reader can
      // tell a skipped day from an untested one by looking.
      id: "monitor",
      label: "Monitor",
      phrases: PHRASES.monitor,
      cells: cellsFor((record) => {
        const reading = storedReading(record.monitor);
        return reading === undefined ? "" : MONITOR_MARKS[reading];
      }, PHRASES.monitor),
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
      label: "Fertile",
      phrases: {},
      // The band is announced from its own `sr-only` in the document, and painted as a solid fill, so it
      // carries neither a mark nor a tint.
      cells: cycleDays.map((day) => ({
        text: "",
        spoken: "",
        tint: "",
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
      phrases: optional.phrases,
      cells: cellsFor(
        (record) => (optional.present(record) ? optional.text(record) : ""),
        optional.phrases,
      ),
    });
  }

  const {
    beginNote,
    evidence,
    evidenceLine: printedEvidence,
    evidenceNote,
  } = algorithmEnabled
    ? describeBegin(result, chartedNos)
    : { beginNote: null, evidence: [] as ChartEvidence[], evidenceLine: null, evidenceNote: null };

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
    evidenceLine: printedEvidence,
    evidenceNote,
    warningLines: algorithmEnabled ? warningLines(result.warnings) : [],
    detailLines: detailLines(records),
    legend: legendFor(rows),
  };
}

/**
 * Symptoms and notes, one line per cycle day, for the prose list beneath the grid.
 *
 * A day holding both names both, joined, so the day is stated once. The value is the recorded text, never
 * a summary of it, and a day with neither contributes no line at all.
 */
function detailLines(records: DayRecordEntity[]): string[] {
  const lines: string[] = [];
  for (const record of records) {
    const parts: string[] = [];
    const symptoms = (record.symptoms ?? []).filter((symptom) => symptom !== "");
    if (symptoms.length > 0) parts.push(symptoms.join(", "));
    if (record.notes !== undefined && record.notes !== "") parts.push(record.notes);
    if (parts.length > 0) lines.push(`Day ${record.dayInCycle}: ${parts.join(", ")}`);
  }
  return lines;
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
): {
  beginNote: string | null;
  evidence: ChartEvidence[];
  evidenceLine: string | null;
  evidenceNote: string | null;
} {
  const { beginRule, begin } = result.fertileWindow;

  if (beginRule === "first-high-or-peak") {
    return {
      beginNote: `Opened on a recorded reading — day ${begin}, the first High or Peak logged this cycle.`,
      evidence: [],
      evidenceLine: null,
      evidenceNote: null,
    };
  }

  if (beginRule === "calendar-day-6") {
    return {
      beginNote: `Opens on cycle day 6 — the calendar rule for the first six cycles.`,
      evidence: [],
      evidenceLine: null,
      evidenceNote: null,
    };
  }

  if (beginRule === "calendar-day-6-fallback") {
    return {
      beginNote: `Opens on cycle day 6 — the history window held no Peak to measure from, so the app fell back to the day-6 rule.`,
      evidence: [],
      evidenceLine: null,
      evidenceNote:
        "No monitor Peak was available for the calendar rule to use, so no Peak day is claimed here.",
    };
  }

  // calendar-earliest-peak-minus-6: the rule that consumes the lookback window.
  const evidence: ChartEvidence[] = result.lookbackPeaks.map((peak) => ({
    cycleNo: peak.cycleNo,
    peakDay: peak.peakDay,
    charted: chartedNos.has(peak.cycleNo),
    // "cycle 3 day 12" — the entry names itself. Whether that cycle is on the page is stated once for
    // the whole line when the run is uniform, so it is not repeated against every entry.
    phrase: `cycle ${peak.cycleNo} day ${peak.peakDay}`,
  }));
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
    evidenceLine: evidenceLine(evidence),
    evidenceNote: null,
  };
}

/**
 * The whole evidence list as one printed line.
 *
 * The run is usually all-charted or wholly uncharted, and saying so once per entry repeated one
 * parenthetical six times per line, on six lines. A uniform run is annotated once at the end; a mixed one
 * marks only the entries that are off the page, because those are the ones a reader has to notice.
 */
function evidenceLine(evidence: ChartEvidence[]): string | null {
  if (evidence.length === 0) return null;
  const onPage = evidence.filter((entry) => entry.charted);
  const uniform = onPage.length === 0 || onPage.length === evidence.length;
  const body = evidence
    .map((entry) =>
      uniform || entry.charted ? entry.phrase : `${entry.phrase} (not on this chart)`,
    )
    .join("  ·  ");
  const suffix =
    onPage.length === evidence.length
      ? " (all on this chart)"
      : onPage.length === 0
        ? " (none on this chart)"
        : "";
  return `${body}${suffix}`;
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
