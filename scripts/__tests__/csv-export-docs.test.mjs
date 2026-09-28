import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCsvExport, CSV_EXPORT_COLUMNS } from "../../src/core/export/csv";

/**
 * The CSV column contract is only useful if the published documentation still
 * describes it. The issue that asked for this export asked for the column names,
 * the date format, and the missing-value representation to be documented, so a
 * column that is added to the writer without a matching README row is a defect
 * in the thing the user actually reads.
 *
 * The header is read from the writer rather than duplicated here, so this test
 * fails on drift instead of passing on a copy that drifted with it.
 *
 * Asserted on the files rather than on a rendered element, which is why this
 * sits beside the other project-file assertions under `scripts/`: app-side tests
 * cannot read from the filesystem.
 */
const README = readFileSync(path.resolve(process.cwd(), "README.md"), "utf8");
const HEADER = buildCsvExport([], []).replace(/^﻿/, "").split("\r\n")[0];

describe("CSV export documentation (csv-export)", () => {
  it("documents every column the export writes", () => {
    for (const column of CSV_EXPORT_COLUMNS) {
      expect(README, `README.md does not document the \`${column}\` column`).toContain(
        `\`${column}\``,
      );
    }
  });

  it("documents the date format the export writes", () => {
    expect(README).toContain("YYYY-MM-DD");
  });

  it("documents how a missing value is represented", () => {
    expect(README).toMatch(/empty cell/i);
    expect(README).toMatch(/not recorded/i);
  });

  it("states that the JSON backup remains the only restorable format", () => {
    expect(README).toMatch(/cannot be imported/i);
    expect(README).toMatch(/only format the app can read back/i);
  });

  it("keeps the header it documents and the header the writer emits in step", () => {
    expect(HEADER).toBe(CSV_EXPORT_COLUMNS.join(","));

    // The other direction: a README row naming a column the writer no longer
    // writes. Scoped to the column table so the README's other tables are not
    // mistaken for column rows. The formatter pads the table cells, so the
    // header is matched on its first cell.
    const lines = README.split("\n");
    const start = lines.findIndex((line) => line.startsWith("| Column"));
    expect(start).toBeGreaterThan(-1);
    const documented = lines
      .slice(start + 1)
      .filter((line) => line.startsWith("|"))
      .map((line) => line.split("`")[1])
      .filter((name) => name !== undefined);
    expect(documented).toHaveLength(CSV_EXPORT_COLUMNS.length);
    for (const name of documented) {
      expect(
        CSV_EXPORT_COLUMNS,
        `README.md documents a \`${name}\` column the export does not write`,
      ).toContain(name);
    }
  });
});
