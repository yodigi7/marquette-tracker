import type { CycleEntity, DayRecordEntity } from "@/core/store/entities";

/**
 * The human-readable CSV projection of stored cycles and day records.
 *
 * Deliberately outside `core/backup`: the JSON backup is the lossless, restorable
 * path, and this file is not one. It carries only what the user entered, so
 * nothing computed by the engine and no record identity ever reaches it (see
 * `openspec/specs/csv-export/spec.md`).
 *
 * A pure module like the backup contract: no React, no Dexie, no browser API.
 */

/**
 * The column contract, in the order the header row is written. This array is
 * the single source of truth — the README table and the writer's row shape are
 * both derived from it, so a new field is added here and documented once.
 */
export const CSV_EXPORT_COLUMNS = [
  "row_type",
  "date",
  "day_in_cycle",
  "monitor",
  "mucus",
  "blood_flow",
  "intercourse",
  "intercourse_time",
  "bbt_c",
  "symptoms",
  "pregnancy_test",
  "notes",
  "cycle_number",
  "cycle_start",
  "cycle_closed",
  "cycle_notes",
] as const;

export type CsvExportColumn = (typeof CSV_EXPORT_COLUMNS)[number];

/** What a row is about: a day the user logged, or a cycle that has no logged days. */
export type CsvRowType = "day" | "cycle";

/** UTF-8 BOM, so Excel reads accented characters in notes instead of mojibake. */
const BYTE_ORDER_MARK = "﻿";

/** RFC 4180 records end with CRLF, which is also what Excel expects. */
const RECORD_SEPARATOR = "\r\n";

const FIELD_SEPARATOR = ",";

/** Semicolons, so a multi-value cell survives a naive comma split. */
const LIST_SEPARATOR = ";";

/** A field the user never recorded, and a value they recorded as empty, both export as this. */
const NOTHING_RECORDED = "";

function escapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function record(fields: readonly string[]): string {
  return fields.map(escapeField).join(FIELD_SEPARATOR);
}

/** Anything absent is "not recorded"; anything present is written as itself. */
function text(value: string | null | undefined): string {
  return value ?? NOTHING_RECORDED;
}

function flag(value: boolean | undefined): string {
  return value === undefined ? NOTHING_RECORDED : String(value);
}

function number(value: number | null | undefined): string {
  // Stored temperatures are canonical Celsius, so the value passes straight
  // through: the writer takes no unit and a display preference cannot reach it.
  return value == null ? NOTHING_RECORDED : String(value);
}

function list(values: string[] | undefined): string {
  return values == null || values.length === 0 ? NOTHING_RECORDED : values.join(LIST_SEPARATOR);
}

interface CsvRow {
  /** The date the row sorts under: a day's own date, or a cycle's start. */
  sortKey: string;
  cycleNo: number;
  rowType: CsvRowType;
  fields: string[];
}

function dayRow(record: DayRecordEntity, cycle: CycleEntity | undefined): CsvRow {
  return {
    sortKey: record.date,
    cycleNo: cycle?.cycleNo ?? 0,
    rowType: "day",
    fields: [
      "day",
      record.date,
      String(record.dayInCycle),
      text(record.monitor),
      text(record.mucus),
      text(record.bloodFlow),
      flag(record.intercourse),
      text(record.intercourseTime),
      number(record.bbt),
      list(record.symptoms),
      text(record.pregnancyTest),
      text(record.notes),
      cycle ? String(cycle.cycleNo) : NOTHING_RECORDED,
      cycle ? cycle.day1 : NOTHING_RECORDED,
      cycle ? text(cycle.closedAt) : NOTHING_RECORDED,
      cycle ? text(cycle.notes) : NOTHING_RECORDED,
    ],
  };
}

function cycleRow(cycle: CycleEntity): CsvRow {
  return {
    sortKey: cycle.day1,
    cycleNo: cycle.cycleNo,
    rowType: "cycle",
    fields: [
      "cycle",
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      NOTHING_RECORDED,
      String(cycle.cycleNo),
      cycle.day1,
      text(cycle.closedAt),
      text(cycle.notes),
    ],
  };
}

/**
 * Builds the whole export as one CSV document: a header row, then one row per
 * day record sorted by date, plus one row for any cycle that has no day records
 * so no cycle the user created is dropped from the file.
 *
 * A day record whose cycle cannot be found is still exported, with empty cycle
 * columns: losing a logged day because its cycle went missing is the worse
 * failure.
 */
export function buildCsvExport(cycles: CycleEntity[], dayRecords: DayRecordEntity[]): string {
  const byId = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const loggedCycleIds = new Set(dayRecords.map((record) => record.cycleId));

  const rows: CsvRow[] = dayRecords.map((dayRecord) =>
    dayRow(dayRecord, byId.get(dayRecord.cycleId)),
  );
  for (const cycle of cycles) {
    if (!loggedCycleIds.has(cycle.id)) {
      rows.push(cycleRow(cycle));
    }
  }

  // Date order, then cycle order, then the cycle row before the day row it
  // shares a date with — so the file reads the same way every time it is made.
  rows.sort(
    (a, b) =>
      a.sortKey.localeCompare(b.sortKey) ||
      a.cycleNo - b.cycleNo ||
      a.rowType.localeCompare(b.rowType),
  );

  const lines = [
    CSV_EXPORT_COLUMNS.join(FIELD_SEPARATOR),
    ...rows.map((row) => record(row.fields)),
  ];
  return `${BYTE_ORDER_MARK}${lines.join(RECORD_SEPARATOR)}${RECORD_SEPARATOR}`;
}
