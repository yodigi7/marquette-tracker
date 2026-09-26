import Dexie, { type EntityTable } from "dexie";
import type { CycleEntity, DayRecordEntity, SettingsEntity } from "./entities";

/**
 * Single source of truth. IndexedDB via Dexie — offline-first, no backend.
 *
 * Migration seam: bump the version number and add stores/upgrade handlers
 * when the schema changes (forward-compatible with future cloud sync).
 */
export type AppDb = Dexie & {
  cycles: EntityTable<CycleEntity, "id">;
  dayRecords: EntityTable<DayRecordEntity, "id">;
  settings: EntityTable<SettingsEntity, "key">;
};

export const db: AppDb = createDb();

export function createDb(): AppDb {
  const instance = new Dexie("marquette-tracker") as AppDb;

  instance.version(1).stores({
    cycles: "id, day1, cycleNo",
    dayRecords: "id, cycleId, date, dayInCycle, [cycleId+date]",
    settings: "key",
  });

  return instance;
}
