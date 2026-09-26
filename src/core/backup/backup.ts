import { todayKey } from "@/core/dateKeys";
import { isDateKey, dateKeyToEpochDays, epochDaysToDateKey } from "@/core/engine/dateUtils";
import type { CycleEntity, DayRecordEntity, SettingsEntity } from "@/core/store/entities";
import { DEFAULT_SETTINGS, SETTINGS_KEY } from "@/core/store/entities";
import { APP_VERSION } from "./version";
import {
  BACKUP_FORMAT,
  BackupError,
  CURRENT_BACKUP_VERSION,
  type BackupDocument,
  type BackupErrorCode,
  type BackupOptions,
  type BackupSnapshot,
  type BackupSummary,
  type PrepareOptions,
  type PreparedBackup,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(code: BackupErrorCode, message: string): never {
  throw new BackupError(code, message);
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isDateKeyValue(value: unknown): value is string {
  if (typeof value !== "string" || !isDateKey(value)) {
    return false;
  }
  try {
    return epochDaysToDateKey(dateKeyToEpochDays(value)) === value;
  } catch {
    return false;
  }
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMeta(value: unknown): {
  version: number;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
} {
  const record = isRecord(value) ? value : {};
  return {
    version: numberOr(record.version, 1),
    synced: false,
    createdAt: stringOr(record.createdAt, ""),
    updatedAt: stringOr(record.updatedAt, ""),
  };
}

function normalizeCycle(value: unknown): CycleEntity {
  if (!isRecord(value)) {
    return fail("invalid-cycle", "Cycle entries must be objects");
  }
  return {
    ...value,
    id: stringOr(value.id, ""),
    day1: stringOr(value.day1, ""),
    cycleNo: numberOr(value.cycleNo, 0),
    closedAt: value.closedAt === null ? null : stringOr(value.closedAt, ""),
    notes: stringOr(value.notes, ""),
    pinned: booleanOr(value.pinned, false),
    ...normalizeMeta(value),
  } as CycleEntity;
}

function normalizeDayRecord(value: unknown): DayRecordEntity {
  if (!isRecord(value)) {
    return fail("invalid-record", "Day record entries must be objects");
  }
  return {
    ...value,
    id: stringOr(value.id, ""),
    cycleId: stringOr(value.cycleId, ""),
    date: stringOr(value.date, ""),
    dayInCycle: numberOr(value.dayInCycle, 0),
    ...normalizeMeta(value),
  } as DayRecordEntity;
}

function normalizeSettings(value: unknown): SettingsEntity {
  if (!isRecord(value)) {
    return fail("invalid-settings", "Backup settings must be an object");
  }
  // Destructure-to-drop is the removal mechanism, not dead code: a backup taken
  // before post-Peak fill was removed still carries these two settings, and
  // they must not be written back to the store. The feature they configured no
  // longer exists, so the restored settings row is authoritative without them.
  const { postPeakFillMode: _fillMode, postPeakSuppressions: _suppressions, ...supported } = value;
  return {
    ...DEFAULT_SETTINGS,
    ...supported,
    key: SETTINGS_KEY,
    ...normalizeMeta(value),
  } as SettingsEntity;
}

function migrate(input: unknown): unknown {
  if (!isRecord(input)) {
    return fail("invalid-format", "Backup root must be an object");
  }
  if (input.format !== BACKUP_FORMAT) {
    return fail("invalid-format", "Unrecognized backup format");
  }

  const version = input.formatVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0) {
    return fail("invalid-format", "Backup format version must be a non-negative integer");
  }
  if (version > CURRENT_BACKUP_VERSION) {
    return fail("unsupported-format", "This backup was created by a newer unsupported app version");
  }

  let current: UnknownRecord = input;
  for (let fromVersion = version; fromVersion < CURRENT_BACKUP_VERSION; fromVersion += 1) {
    if (fromVersion !== 0) {
      return fail("unsupported-format", "No migration is registered for this backup version");
    }
    const data = current.data;
    if (!isRecord(data)) {
      return fail("invalid-document", "Backup data must be an object");
    }
    const settings = isRecord(data.settings)
      ? { ...DEFAULT_SETTINGS, ...data.settings }
      : data.settings;
    current = {
      ...current,
      formatVersion: CURRENT_BACKUP_VERSION,
      data: {
        ...data,
        settings,
      },
    };
  }

  return current;
}

function normalizeDocument(input: unknown): BackupDocument {
  if (!isRecord(input) || input.format !== BACKUP_FORMAT) {
    return fail("invalid-format", "Unrecognized backup format");
  }
  if (input.formatVersion !== CURRENT_BACKUP_VERSION) {
    return fail("unsupported-format", "Backup version could not be migrated");
  }
  if (
    typeof input.appVersion !== "string" ||
    !isIsoDate(input.exportedAt) ||
    !isRecord(input.data)
  ) {
    return fail("invalid-document", "Backup metadata or data is invalid");
  }

  const data = input.data;
  if (!Array.isArray(data.cycles) || !Array.isArray(data.dayRecords) || !isRecord(data.settings)) {
    return fail("invalid-document", "Backup data must contain cycles, dayRecords, and settings");
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: CURRENT_BACKUP_VERSION,
    appVersion: input.appVersion,
    exportedAt: input.exportedAt,
    data: {
      cycles: data.cycles.map(normalizeCycle),
      dayRecords: data.dayRecords.map(normalizeDayRecord),
      settings: normalizeSettings(data.settings),
    },
  };
}

function validateMeta(
  meta: { version: number; synced: boolean; createdAt: string; updatedAt: string },
  code: BackupErrorCode,
): void {
  if (!Number.isInteger(meta.version) || meta.version < 1 || typeof meta.synced !== "boolean") {
    fail(code, "Record revision metadata is invalid");
  }
  if (typeof meta.createdAt !== "string" || typeof meta.updatedAt !== "string") {
    fail(code, "Record timestamps are invalid");
  }
}

function validateCycle(cycle: CycleEntity): void {
  if (
    !cycle.id ||
    !isDateKeyValue(cycle.day1) ||
    !Number.isInteger(cycle.cycleNo) ||
    cycle.cycleNo < 1
  ) {
    fail("invalid-cycle", "Cycle identity or start date is invalid");
  }
  if (cycle.closedAt !== null && !isDateKeyValue(cycle.closedAt)) {
    fail("invalid-cycle", "Cycle close date is invalid");
  }
  if (
    typeof cycle.notes !== "string" ||
    (cycle.pinned !== undefined && typeof cycle.pinned !== "boolean")
  ) {
    fail("invalid-cycle", "Cycle metadata is invalid");
  }
  validateMeta(cycle, "invalid-cycle");
}

function validateDayRecord(record: DayRecordEntity, today: string): void {
  if (
    !record.id ||
    typeof record.cycleId !== "string" ||
    !isDateKeyValue(record.date) ||
    record.date > today
  ) {
    fail(
      record.date > today ? "future-date" : "invalid-record",
      "Day record identity or date is invalid",
    );
  }
  if (!Number.isInteger(record.dayInCycle) || record.dayInCycle < 1) {
    fail("invalid-record", "Day record cycle day is invalid");
  }
  if (record.monitor !== undefined && !["none", "low", "high", "peak"].includes(record.monitor)) {
    fail("invalid-record", "Monitor reading is invalid");
  }
  if (record.mucus !== undefined && !["none", "low", "high", "peak"].includes(record.mucus)) {
    fail("invalid-record", "Mucus reading is invalid");
  }
  if (
    record.bloodFlow !== undefined &&
    !["none", "light", "medium", "heavy"].includes(record.bloodFlow)
  ) {
    fail("invalid-record", "Blood flow reading is invalid");
  }
  if (record.intercourse !== undefined && typeof record.intercourse !== "boolean") {
    fail("invalid-record", "Intercourse value is invalid");
  }
  if (record.intercourseTime !== undefined && typeof record.intercourseTime !== "string") {
    fail("invalid-record", "Intercourse time is invalid");
  }
  if (
    record.bbt !== undefined &&
    record.bbt !== null &&
    (typeof record.bbt !== "number" || !Number.isFinite(record.bbt))
  ) {
    fail("invalid-record", "BBT value is invalid");
  }
  if (
    record.symptoms !== undefined &&
    (!Array.isArray(record.symptoms) || record.symptoms.some((item) => typeof item !== "string"))
  ) {
    fail("invalid-record", "Symptoms are invalid");
  }
  if (
    record.pregnancyTest !== undefined &&
    !["negative", "positive"].includes(record.pregnancyTest)
  ) {
    fail("invalid-record", "Pregnancy test value is invalid");
  }
  if (record.notes !== undefined && typeof record.notes !== "string") {
    fail("invalid-record", "Notes are invalid");
  }
  validateMeta(record, "invalid-record");
}

function validateSettings(settings: SettingsEntity): void {
  if (
    settings.key !== SETTINGS_KEY ||
    !["avoid-pregnancy", "achieve-pregnancy", "track-only"].includes(settings.goal)
  ) {
    fail("invalid-settings", "Settings identity or goal is invalid");
  }
  if (typeof settings.algorithmEnabled !== "boolean") {
    fail("invalid-settings", "Algorithm setting is invalid");
  }
  if (
    !Number.isInteger(settings.postPeakDays) ||
    settings.postPeakDays < 0 ||
    settings.postPeakDays > 10
  ) {
    fail("invalid-settings", "Post-Peak days must be an integer between 0 and 10");
  }
  if (
    !Number.isInteger(settings.historyWindow) ||
    settings.historyWindow < 1 ||
    settings.historyWindow > 12
  ) {
    fail("invalid-settings", "History window must be an integer between 1 and 12");
  }
  if (
    !["light", "dark", "system"].includes(settings.theme) ||
    !["monday", "sunday"].includes(settings.weekStart)
  ) {
    fail("invalid-settings", "Display settings are invalid");
  }
  if (
    !Number.isInteger(settings.cycleMinLength) ||
    !Number.isInteger(settings.cycleMaxLength) ||
    settings.cycleMinLength < 15 ||
    settings.cycleMaxLength > 60 ||
    settings.cycleMinLength >= settings.cycleMaxLength
  ) {
    fail("invalid-settings", "Cycle length band is invalid");
  }
  if (
    typeof settings.overlayMucus !== "boolean" ||
    typeof settings.overlayBbt !== "boolean" ||
    typeof settings.overlayIntercourse !== "boolean"
  ) {
    fail("invalid-settings", "Chart overlay settings are invalid");
  }
  if (settings.calendarDetailMode !== "simple" && settings.calendarDetailMode !== "full") {
    fail("invalid-settings", "Calendar detail mode is invalid");
  }
  if (typeof settings.projectFutureCycles !== "boolean") {
    fail("invalid-settings", "Cycle projection setting is invalid");
  }
  if (typeof settings.demoSeeded !== "boolean") {
    fail("invalid-settings", "Demo marker is invalid");
  }
  validateMeta(settings, "invalid-settings");
}

function validateDocument(document: BackupDocument, today: string): void {
  const cycleIds = new Set<string>();
  for (const cycle of document.data.cycles) {
    if (cycleIds.has(cycle.id)) {
      fail("duplicate-id", "Backup contains duplicate cycle ids");
    }
    cycleIds.add(cycle.id);
    validateCycle(cycle);
  }

  const recordIds = new Set<string>();
  const recordDates = new Set<string>();
  for (const record of document.data.dayRecords) {
    if (recordIds.has(record.id)) {
      fail("duplicate-id", "Backup contains duplicate day-record ids");
    }
    recordIds.add(record.id);
    validateDayRecord(record, today);
    if (recordDates.has(record.date)) {
      fail("duplicate-date", "Backup contains multiple day records for the same date");
    }
    recordDates.add(record.date);
  }

  validateSettings(document.data.settings);
}

export function createBackup(
  snapshot: BackupSnapshot,
  options: BackupOptions = {},
): BackupDocument {
  return {
    format: BACKUP_FORMAT,
    formatVersion: CURRENT_BACKUP_VERSION,
    appVersion: options.appVersion ?? APP_VERSION,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    data: {
      cycles: jsonClone(snapshot.cycles),
      dayRecords: jsonClone(snapshot.dayRecords),
      settings: { ...jsonClone(snapshot.settings), demoSeeded: true },
    },
  };
}

export function serializeBackup(document: BackupDocument): string {
  return JSON.stringify(document, null, 2);
}

export function getBackupSummary(document: BackupDocument): BackupSummary {
  return {
    format: document.format,
    formatVersion: document.formatVersion,
    appVersion: document.appVersion,
    exportedAt: document.exportedAt,
    cycleCount: document.data.cycles.length,
    dayRecordCount: document.data.dayRecords.length,
    settingsIncluded: Boolean(document.data.settings),
  };
}

export function prepareBackupDocument(
  input: unknown,
  options: PrepareOptions = {},
): PreparedBackup {
  const migrated = migrate(input);
  const document = normalizeDocument(migrated);
  validateDocument(document, options.today ?? todayKey());
  return { document, summary: getBackupSummary(document) };
}

export function prepareBackup(text: string, options: PrepareOptions = {}): PreparedBackup {
  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    return fail("invalid-json", "Backup file is not valid JSON");
  }
  return prepareBackupDocument(input, options);
}
