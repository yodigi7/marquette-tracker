import { describe, expect, it } from "vitest";
import type { CycleEntity, DayRecordEntity, SettingsEntity } from "@/core/store/entities";
import { DEFAULT_SETTINGS } from "@/core/store/entities";
import {
  BACKUP_FORMAT,
  CURRENT_BACKUP_VERSION,
  BackupError,
  countImplausibleBbt,
  createBackup,
  getBackupSummary,
  prepareBackup,
  prepareBackupDocument,
  serializeBackup,
} from "../index";

const createdAt = "2026-01-01T00:00:00.000Z";
const updatedAt = "2026-01-02T00:00:00.000Z";

function meta(overrides: Partial<SyncMeta> = {}): SyncMeta {
  return {
    version: 3,
    synced: true,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

interface SyncMeta {
  version: number;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

function cycle(overrides: Partial<CycleEntity> = {}): CycleEntity {
  return {
    id: "cycle-1",
    day1: "2026-01-01",
    cycleNo: 1,
    closedAt: null,
    notes: "first cycle",
    pinned: true,
    ...meta(),
    ...overrides,
  };
}

function dayRecord(overrides: Partial<DayRecordEntity> = {}): DayRecordEntity {
  return {
    id: "day-1",
    cycleId: "cycle-1",
    date: "2026-01-10",
    dayInCycle: 10,
    monitor: "peak",
    ...meta(),
    ...overrides,
  };
}

function settings(overrides: Partial<SettingsEntity> = {}): SettingsEntity {
  return {
    ...DEFAULT_SETTINGS,
    key: "main",
    ...meta(),
    ...overrides,
  };
}

function snapshot(overrides: Partial<Parameters<typeof createBackup>[0]> = {}) {
  return {
    cycles: [cycle()],
    dayRecords: [dayRecord()],
    settings: settings(),
    ...overrides,
  };
}

describe("JSON backup contract", () => {
  it("creates a readable versioned envelope without derived output", () => {
    const document = createBackup(snapshot(), {
      appVersion: "1.2.3",
      exportedAt: "2026-02-03T04:05:06.000Z",
    });

    expect(document).toMatchObject({
      format: BACKUP_FORMAT,
      formatVersion: CURRENT_BACKUP_VERSION,
      appVersion: "1.2.3",
      exportedAt: "2026-02-03T04:05:06.000Z",
    });
    expect(document.data.cycles).toHaveLength(1);
    expect(document.data.dayRecords).toHaveLength(1);
    expect(document.data.settings.key).toBe("main");
    expect(document).not.toHaveProperty("data.output");
    expect(serializeBackup(document)).toContain('\n  "format"');
  });

  it("round-trips identity, content, and metadata while resetting sync flags", () => {
    const document = createBackup(
      snapshot({
        dayRecords: [
          dayRecord({ id: "day-user", notes: "user note", synced: true }),
          dayRecord({ id: "day-two", date: "2026-01-20", monitor: "low", synced: true }),
        ],
        settings: settings({ synced: true, goal: "achieve-pregnancy" }),
      }),
      { appVersion: "1.0.0", exportedAt: createdAt },
    );

    const prepared = prepareBackup(serializeBackup(document));
    const user = prepared.document.data.dayRecords.find((record) => record.id === "day-user");
    const second = prepared.document.data.dayRecords.find((record) => record.id === "day-two");

    expect(prepared.summary).toMatchObject({
      cycleCount: 1,
      dayRecordCount: 2,
      settingsIncluded: true,
    });
    expect(user).toMatchObject({
      id: "day-user",
      notes: "user note",
      version: 3,
      createdAt,
      updatedAt,
      synced: false,
    });
    expect(second).toMatchObject({ id: "day-two", monitor: "low", synced: false });
    expect(prepared.document.data.settings).toMatchObject({
      goal: "achieve-pregnancy",
      synced: false,
    });
  });

  it("exports no record origin and no fill preference", () => {
    const document = createBackup(snapshot(), { appVersion: "1.0.0", exportedAt: createdAt });
    const serialized = serializeBackup(document);

    expect(serialized).not.toContain("dataOrigin");
    expect(serialized).not.toContain("postPeakFillMode");
    expect(serialized).not.toContain("postPeakSuppressions");
    expect(serialized).not.toContain("postPeakDays");
    expect(document.data.dayRecords[0]).not.toHaveProperty("dataOrigin");
    expect(document.data.settings).not.toHaveProperty("postPeakFillMode");
    expect(document.data.settings).not.toHaveProperty("postPeakDays");
  });

  it("drops a stored post-Peak interval from a legacy document", () => {
    // The fertile-window end is a fixed protocol constant, so a value written by
    // an earlier app version must not survive into the restored settings row.
    const document = createBackup(snapshot(), { appVersion: "1.0.0", exportedAt: createdAt });
    const legacy = JSON.parse(serializeBackup(document)) as {
      data: { settings: Record<string, unknown> };
    };
    legacy.data.settings.postPeakDays = 4;

    const prepared = prepareBackup(JSON.stringify(legacy));

    expect(prepared.document.data.settings).not.toHaveProperty("postPeakDays");
  });

  it("accepts a document that still carries the legacy record origin", () => {
    const document = createBackup(snapshot(), { appVersion: "1.0.0", exportedAt: createdAt });
    const legacy = JSON.parse(serializeBackup(document)) as Record<string, never>;
    (legacy.data as unknown as { dayRecords: Record<string, unknown>[] }).dayRecords[0].dataOrigin =
      "inferred";

    const prepared = prepareBackup(JSON.stringify(legacy));

    expect(prepared.document.data.dayRecords).toHaveLength(1);
  });

  it("defaults a legacy settings row without a calendar detail mode to simple", () => {
    const legacy = settings({ calendarDetailMode: "full" });
    delete (legacy as Partial<SettingsEntity>).calendarDetailMode;

    const prepared = prepareBackup(
      serializeBackup(
        createBackup(snapshot({ settings: legacy }), {
          appVersion: "1.0.0",
          exportedAt: createdAt,
        }),
      ),
    );

    expect(prepared.document.data.settings.calendarDetailMode).toBe("simple");
  });

  it("round-trips the cycle projection setting", () => {
    const document = createBackup(snapshot({ settings: settings({ projectFutureCycles: true }) }), {
      appVersion: "1.0.0",
      exportedAt: createdAt,
    });

    const prepared = prepareBackup(serializeBackup(document));

    expect(prepared.document.data.settings.projectFutureCycles).toBe(true);
  });

  it("defaults a legacy settings row without a cycle projection value to off", () => {
    const legacy = settings({ projectFutureCycles: true });
    delete (legacy as Partial<SettingsEntity>).projectFutureCycles;

    const prepared = prepareBackup(
      serializeBackup(
        createBackup(snapshot({ settings: legacy }), {
          appVersion: "1.0.0",
          exportedAt: createdAt,
        }),
      ),
    );

    expect(prepared.document.data.settings.projectFutureCycles).toBe(false);
  });

  it("rejects a non-boolean cycle projection setting", () => {
    const document = createBackup(snapshot(), { appVersion: "1.0.0", exportedAt: createdAt });
    const raw = JSON.parse(serializeBackup(document)) as {
      data: { settings: Record<string, unknown> };
    };
    raw.data.settings.projectFutureCycles = "yes";

    expect(() => prepareBackup(JSON.stringify(raw))).toThrow();
  });

  it("leaves the backup format version unchanged for the additive setting", () => {
    const document = createBackup(snapshot({ settings: settings({ projectFutureCycles: true }) }), {
      appVersion: "1.0.0",
      exportedAt: createdAt,
    });

    expect(document.formatVersion).toBe(CURRENT_BACKUP_VERSION);
    // additive field only: no other key appears or disappears
    expect(Object.keys(document.data.settings).sort()).toEqual(
      Object.keys(
        createBackup(snapshot(), { appVersion: "1.0.0", exportedAt: createdAt }).data.settings,
      ).sort(),
    );
  });

  it("accepts an empty dataset when settings are valid", () => {
    const prepared = prepareBackup(
      serializeBackup(
        createBackup(snapshot({ cycles: [], dayRecords: [] }), {
          appVersion: "1.0.0",
          exportedAt: createdAt,
        }),
      ),
    );

    expect(prepared.document.data.cycles).toEqual([]);
    expect(prepared.document.data.dayRecords).toEqual([]);
    expect(getBackupSummary(prepared.document).cycleCount).toBe(0);
  });
});

describe("backup migrations and strict validation", () => {
  it("migrates a supported older format before validating it", () => {
    const older = {
      format: BACKUP_FORMAT,
      formatVersion: 0,
      appVersion: "0.9.0",
      exportedAt: createdAt,
      data: {
        cycles: [cycle()],
        dayRecords: [{ ...dayRecord(), dataOrigin: "inferred" }],
        settings: {
          ...settings(),
          postPeakFillMode: "after-user-low",
          postPeakSuppressions: [{ date: "2026-01-21" }],
        },
      },
    };

    const prepared = prepareBackup(JSON.stringify(older));

    // Format version is unchanged: the change only removes fields.
    expect(prepared.document.formatVersion).toBe(CURRENT_BACKUP_VERSION);
    // Removed fields are no longer carried as meaningful state.
    expect(prepared.document.data.settings).not.toHaveProperty("postPeakFillMode");
    expect(prepared.document.data.settings).not.toHaveProperty("postPeakSuppressions");
  });

  it.each([
    ["a newer format", CURRENT_BACKUP_VERSION + 1, "unsupported-format"],
    ["malformed JSON", "{not-json", "invalid-json"],
    ["a wrong discriminator", BACKUP_FORMAT, "invalid-format"],
  ] as const)("rejects %s", (_label, value, code) => {
    const text =
      typeof value === "number"
        ? JSON.stringify({
            format: BACKUP_FORMAT,
            formatVersion: value,
            appVersion: "1.0.0",
            exportedAt: createdAt,
            data: { cycles: [], dayRecords: [], settings: settings() },
          })
        : value === "{not-json"
          ? value
          : JSON.stringify({
              format: "not-marquette",
              formatVersion: CURRENT_BACKUP_VERSION,
              appVersion: "1.0.0",
              exportedAt: createdAt,
              data: { cycles: [], dayRecords: [], settings: settings() },
            });

    expect(() => prepareBackup(text)).toThrowError(expect.objectContaining({ code }));
  });

  it.each([
    [
      "duplicate cycle ids",
      snapshot({ cycles: [cycle(), cycle({ day1: "2026-02-01" })] }),
      "duplicate-id",
    ],
    [
      "duplicate day-record ids",
      snapshot({ dayRecords: [dayRecord(), dayRecord({ date: "2026-01-11" })] }),
      "duplicate-id",
    ],
    [
      "duplicate day-record dates",
      snapshot({ dayRecords: [dayRecord(), dayRecord({ id: "day-2" })] }),
      "duplicate-date",
    ],
    [
      "invalid settings",
      snapshot({ settings: settings({ historyWindow: 99 }) }),
      "invalid-settings",
    ],
    [
      "future day record",
      snapshot({ dayRecords: [dayRecord({ date: "2099-01-01" })] }),
      "future-date",
    ],
  ] as const)("rejects %s", (_label, input, code) => {
    const text = serializeBackup(
      createBackup(input, { appVersion: "1.0.0", exportedAt: createdAt }),
    );
    expect(() => prepareBackup(text)).toThrowError(expect.objectContaining({ code }));
  });

  it("exposes a typed error for callers to map to UI copy", () => {
    try {
      prepareBackup("{not-json");
      expect.unreachable("expected prepareBackup to reject malformed JSON");
    } catch (error) {
      expect(error).toBeInstanceOf(BackupError);
      expect((error as BackupError).code).toBe("invalid-json");
    }
  });
});

describe("calendar layer visibility in a backup", () => {
  it("round-trips a hidden layer through export and restore", () => {
    const document = createBackup(
      snapshot({ settings: settings({ hiddenCalendarLayers: ["menses", "fertile"] }) }),
      { appVersion: "1.0.0", exportedAt: createdAt },
    );
    expect(document.data.settings.hiddenCalendarLayers).toEqual(["menses", "fertile"]);

    const prepared = prepareBackupDocument(document, { today: "2026-01-15" });
    expect(prepared.document.data.settings.hiddenCalendarLayers).toEqual(["menses", "fertile"]);
  });

  it("restores nothing hidden when the backup carries no preference", () => {
    const document = createBackup(snapshot(), { appVersion: "1.0.0", exportedAt: createdAt });
    const prepared = prepareBackupDocument(document, { today: "2026-01-15" });
    expect(prepared.document.data.settings.hiddenCalendarLayers).toEqual([]);
  });

  it("discards an unrecognised layer id instead of failing the restore", () => {
    // A display preference must never be the reason a stored record cannot be
    // read back, so an id this build does not know is dropped, not rejected.
    const document = createBackup(
      snapshot({
        settings: settings({
          hiddenCalendarLayers: ["menses", "a-layer-from-another-version"] as never,
        }),
      }),
      { appVersion: "1.0.0", exportedAt: createdAt },
    );
    const prepared = prepareBackupDocument(document, { today: "2026-01-15" });
    expect(prepared.document.data.settings.hiddenCalendarLayers).toEqual(["menses"]);
  });

  it("discards a stored value that is not a list of layer ids", () => {
    const document = createBackup(
      snapshot({ settings: settings({ hiddenCalendarLayers: "menses" as never }) }),
      { appVersion: "1.0.0", exportedAt: createdAt },
    );
    const prepared = prepareBackupDocument(document, { today: "2026-01-15" });
    expect(prepared.document.data.settings.hiddenCalendarLayers).toEqual([]);
  });

  it("keeps a backup with an unusable layer value restorable rather than rejecting it", () => {
    const input = JSON.parse(
      JSON.stringify(
        createBackup(snapshot({ settings: settings() }), {
          appVersion: "1.0.0",
          exportedAt: createdAt,
        }),
      ),
    );
    input.data.settings.hiddenCalendarLayers = { nope: true };

    const prepared = prepareBackupDocument(input, { today: "2026-01-15" });
    expect(prepared.document.data.settings.hiddenCalendarLayers).toEqual([]);
  });
});

describe("basal temperature in a backup", () => {
  function withBbt(...values: (number | null)[]) {
    return snapshot({
      dayRecords: values.map((bbt, index) =>
        dayRecord({
          id: `day-${index}`,
          date: `2026-01-${10 + index}`,
          dayInCycle: 10 + index,
          bbt,
        }),
      ),
    });
  }

  it("round-trips every stored temperature exactly", () => {
    const source = withBbt(36.5, 36.77777777777778, 34.2, null);
    const restored = prepareBackupDocument(createBackup(source), { today: "2026-02-01" });

    expect(restored.document.data.dayRecords.map((r) => r.bbt)).toEqual([
      36.5,
      36.77777777777778,
      34.2,
      null,
    ]);
  });

  it("carries the same stored values whatever the display preference is", () => {
    const celsius = createBackup(withBbt(36.5, 37.1), {
      appVersion: "1.0.0",
      exportedAt: createdAt,
    });
    const fahrenheit = createBackup(withBbt(36.5, 37.1), {
      appVersion: "1.0.0",
      exportedAt: createdAt,
    });

    // The unit is a display preference; the document is byte-identical either way.
    expect(JSON.stringify(fahrenheit.data.dayRecords)).toBe(
      JSON.stringify(celsius.data.dayRecords),
    );
  });

  it("still refuses a temperature that is not a finite number", () => {
    // Build the document as text: a hand-edited or foreign file is the case this
    // check exists for. createBackup would JSON-clone NaN and Infinity to null,
    // which is a different (and already valid) shape.
    // `null` is deliberately absent: a cleared temperature is valid and must
    // still restore. Only a value that is present and not a finite number fails.
    for (const raw of ['"36.5"', "true", '{"a":1}']) {
      const text = JSON.stringify({
        format: BACKUP_FORMAT,
        formatVersion: CURRENT_BACKUP_VERSION,
        appVersion: "1.0.0",
        exportedAt: createdAt,
        data: {
          cycles: [cycle()],
          dayRecords: [dayRecord({ bbt: JSON.parse(raw) as number })],
          settings: settings(),
        },
      });
      expect(() => prepareBackup(text, { today: "2026-02-01" })).toThrow(BackupError);
    }
  });

  it("refuses a non-numeric temperature written into a document", () => {
    const document = createBackup(snapshot({ dayRecords: [dayRecord({ bbt: 36.5 })] }));
    // Corrupt it the way a foreign or hand-edited file would be corrupted.
    const text = serializeBackup(document).replace('"bbt": 36.5', '"bbt": "36.5"');
    expect(() => prepareBackup(text, { today: "2026-02-01" })).toThrow(BackupError);
  });

  it("restores an implausible finite reading exactly and reports it", () => {
    // A Fahrenheit value written into a Celsius field before validation existed.
    const document = createBackup(withBbt(36.5, 98.2));
    const prepared = prepareBackupDocument(document, { today: "2026-02-01" });

    // Not rejected: refusing would leave this user unable to restore at all.
    expect(prepared.document.data.dayRecords.map((r) => r.bbt)).toEqual([36.5, 98.2]);
    expect(countImplausibleBbt(prepared.document.data.dayRecords)).toBe(1);
  });

  it("reports no implausible readings for ordinary data", () => {
    const prepared = prepareBackupDocument(createBackup(withBbt(36.5, 37.1, 34.5, 39.8)), {
      today: "2026-02-01",
    });
    // 39.8 is plausible-but-unusual: kept without comment. 34.5 too.
    expect(countImplausibleBbt(prepared.document.data.dayRecords)).toBe(0);
  });

  it("does not bump the backup format version", () => {
    expect(CURRENT_BACKUP_VERSION).toBe(1);
  });
});
