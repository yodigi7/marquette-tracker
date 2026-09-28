import { describe, expect, it } from "vitest";
import type { CycleEntity, DayRecordEntity } from "@/core/store/entities";
import { buildCsvExport, CSV_EXPORT_COLUMNS, type CsvExportColumn } from "@/core/export";

const stamp = "2026-01-01T00:00:00.000Z";

function meta(version = 1) {
  return { version, synced: true, createdAt: stamp, updatedAt: stamp };
}

function cycle(overrides: Partial<CycleEntity> = {}): CycleEntity {
  return {
    id: "cycle-1",
    day1: "2026-01-01",
    cycleNo: 1,
    closedAt: "2026-01-31",
    notes: "",
    ...meta(),
    ...overrides,
  };
}

function day(overrides: Partial<DayRecordEntity> = {}): DayRecordEntity {
  return {
    id: "day-1",
    cycleId: "cycle-1",
    date: "2026-01-01",
    dayInCycle: 1,
    ...meta(),
    ...overrides,
  };
}

/** Strips the BOM and splits on CRLF, which is the only record separator the writer emits. */
function parse(text: string): string[] {
  return text.replace(/^﻿/, "").split("\r\n");
}

/** A CSV record split into its cells, honouring quoted fields. */
function cells(record: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < record.length; index += 1) {
    const char = record[index];
    if (quoted) {
      if (char === '"') {
        if (record[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function rows(text: string): string[][] {
  const records = parse(text);
  // Every file ends with CRLF, so the split leaves one empty trailing element.
  return records.slice(0, -1).map(cells);
}

function column(text: string, name: CsvExportColumn): string[] {
  const index = CSV_EXPORT_COLUMNS.indexOf(name);
  expect(index).toBeGreaterThanOrEqual(0);
  return rows(text)
    .slice(1)
    .map((row) => row[index]);
}

describe("CSV column contract", () => {
  it("writes the documented header row", () => {
    const text = buildCsvExport([], []);

    expect(parse(text)[0]).toBe(CSV_EXPORT_COLUMNS.join(","));
  });

  it("names the unit in the temperature column", () => {
    expect(CSV_EXPORT_COLUMNS).toContain("bbt_c");
  });
});

describe("CSV file shape", () => {
  it("emits one row per day record, sorted by date, carrying its cycle", () => {
    const cycles = [
      cycle(),
      cycle({ id: "cycle-2", day1: "2026-02-01", cycleNo: 2, closedAt: null }),
    ];
    const dayRecords = [
      day({ id: "b", cycleId: "cycle-2", date: "2026-02-03", dayInCycle: 3, monitor: "low" }),
      day({ id: "a", cycleId: "cycle-1", date: "2026-01-14", dayInCycle: 14, monitor: "peak" }),
    ];

    const parsed = rows(buildCsvExport(cycles, dayRecords));

    expect(parsed).toHaveLength(3);
    expect(column(buildCsvExport(cycles, dayRecords), "date")).toEqual([
      "2026-01-14",
      "2026-02-03",
    ]);
    expect(column(buildCsvExport(cycles, dayRecords), "cycle_number")).toEqual(["1", "2"]);
    expect(column(buildCsvExport(cycles, dayRecords), "cycle_start")).toEqual([
      "2026-01-01",
      "2026-02-01",
    ]);
    expect(column(buildCsvExport(cycles, dayRecords), "row_type")).toEqual(["day", "day"]);
  });

  it("writes an open cycle's close date as an empty cell", () => {
    const text = buildCsvExport([cycle({ closedAt: null })], [day()]);

    expect(column(text, "cycle_closed")).toEqual([""]);
  });

  it("gives a cycle with no day records its own row", () => {
    const logged = cycle();
    const empty = cycle({ id: "cycle-2", cycleNo: 2, day1: "2026-02-01", notes: "No entries" });
    const text = buildCsvExport([logged, empty], [day()]);

    const parsed = rows(text);
    expect(parsed).toHaveLength(3);
    expect(column(text, "row_type")).toEqual(["day", "cycle"]);
    expect(column(text, "cycle_number")).toEqual(["1", "2"]);
    expect(column(text, "cycle_notes")).toEqual(["", "No entries"]);
    // The cycle-only row carries no day, so every day column is empty and the
    // row is identifiable as such without relying on a blank date.
    const cycleRow = parsed[2];
    const dayColumns: CsvExportColumn[] = [
      "date",
      "day_in_cycle",
      "monitor",
      "mucus",
      "bbt_c",
      "notes",
    ];
    for (const name of dayColumns) {
      expect(cycleRow[CSV_EXPORT_COLUMNS.indexOf(name)]).toBe("");
    }
  });

  it("emits the header alone when there is no data", () => {
    const parsed = rows(buildCsvExport([], []));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(CSV_EXPORT_COLUMNS);
  });

  it("keeps a day record whose cycle is missing, with empty cycle columns", () => {
    const text = buildCsvExport([], [day({ cycleId: "cycle-gone" })]);

    const parsed = rows(text);
    expect(parsed).toHaveLength(2);
    expect(column(text, "date")).toEqual(["2026-01-01"]);
    expect(column(text, "cycle_number")).toEqual([""]);
    expect(column(text, "cycle_start")).toEqual([""]);
  });
});

describe("CSV missing values", () => {
  // An empty cell means "never recorded". A value the user did record is
  // written literally, so "none" and "false" must survive as themselves.
  const cases: [string, Partial<DayRecordEntity>, CsvExportColumn, string][] = [
    ["no monitor reading", {}, "monitor", ""],
    ["a recorded monitor none", { monitor: "none" }, "monitor", "none"],
    ["a recorded monitor low", { monitor: "low" }, "monitor", "low"],
    ["no mucus reading", {}, "mucus", ""],
    ["a recorded mucus peak", { mucus: "peak" }, "mucus", "peak"],
    ["no blood flow", {}, "blood_flow", ""],
    ["no intercourse", {}, "intercourse", ""],
    ["a recorded intercourse false", { intercourse: false }, "intercourse", "false"],
    ["a recorded intercourse true", { intercourse: true }, "intercourse", "true"],
    ["no intercourse time", {}, "intercourse_time", ""],
    ["no temperature", {}, "bbt_c", ""],
    ["a cleared temperature", { bbt: null }, "bbt_c", ""],
    ["no pregnancy test", {}, "pregnancy_test", ""],
    ["a recorded negative test", { pregnancyTest: "negative" }, "pregnancy_test", "negative"],
    ["no symptoms", {}, "symptoms", ""],
    ["an empty symptom list", { symptoms: [] }, "symptoms", ""],
    ["no note", {}, "notes", ""],
  ];

  for (const [label, patch, name, expected] of cases) {
    it(`distinguishes ${label} (${name})`, () => {
      expect(column(buildCsvExport([cycle()], [day(patch)]), name)).toEqual([expected]);
    });
  }

  it("joins several symptoms into one cell with semicolons", () => {
    const text = buildCsvExport([cycle()], [day({ symptoms: ["aching", "tender"] })]);

    expect(column(text, "symptoms")).toEqual(["aching;tender"]);
  });
});

describe("CSV temperatures", () => {
  it("writes the stored Celsius value through unchanged", () => {
    // The writer takes no unit parameter, so a Fahrenheit display preference
    // cannot reach the file: the stored value is what is written.
    const cases: [number, string][] = [
      [36.5, "36.5"],
      [36, "36"],
      [36.55, "36.55"],
    ];

    for (const [stored, expected] of cases) {
      expect(column(buildCsvExport([cycle()], [day({ bbt: stored })]), "bbt_c")).toEqual([
        expected,
      ]);
    }
  });
});

describe("CSV quoting", () => {
  it("quotes free text that would otherwise break the row", () => {
    const note = 'cycle day 1, "heavy" flow\nsecond line';
    const text = buildCsvExport([cycle()], [day({ notes: note })]);

    expect(text).toContain(`"${note.replace(/"/g, '""')}"`);
    // Quoting is structural: the record still splits into exactly one row whose
    // notes cell holds the note intact.
    const parsed = rows(text);
    expect(parsed).toHaveLength(2);
    expect(parsed[1][CSV_EXPORT_COLUMNS.indexOf("notes")]).toBe(note);
  });

  it("leaves a plain value unquoted", () => {
    const text = buildCsvExport([cycle()], [day({ notes: "plain" })]);

    // Nothing in this record needs quoting, so the file carries no quote at all.
    expect(text).not.toContain('"');
  });

  it("quotes a symptom list that itself contains a comma", () => {
    const text = buildCsvExport([cycle()], [day({ symptoms: ["aching, dull", "tender"] })]);

    expect(rows(text)[1][CSV_EXPORT_COLUMNS.indexOf("symptoms")]).toBe("aching, dull;tender");
  });
});

describe("CSV encoding", () => {
  it("starts with a UTF-8 BOM so spreadsheets read accented notes", () => {
    expect(buildCsvExport([], []).charCodeAt(0)).toBe(0xfeff);
  });

  it("separates records with CRLF and ends with a trailing CRLF", () => {
    const text = buildCsvExport(
      [cycle()],
      [day(), day({ id: "day-2", date: "2026-01-02", dayInCycle: 2 })],
    );

    expect(text.endsWith("\r\n")).toBe(true);
    expect(text.slice(1)).not.toContain("\n\n");
    expect(parse(text)).toHaveLength(4);
  });

  it("passes non-ASCII text through unchanged", () => {
    const text = buildCsvExport([cycle()], [day({ notes: "Müde, fatigue" })]);

    expect(rows(text)[1][CSV_EXPORT_COLUMNS.indexOf("notes")]).toBe("Müde, fatigue");
  });
});
