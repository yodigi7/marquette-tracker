import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { addDays } from "@/core/engine/dateUtils";
import { createDb } from "../db";
import type { SettingsEntity } from "../entities";
import { createAppStore, FutureDateError } from "../useAppStore";

function setup() {
  const db = createDb();
  const useStore = createAppStore(db);
  return { db, store: useStore };
}

function state(store: ReturnType<typeof createAppStore>) {
  return store.getState();
}

beforeEach(async () => {
  await indexedDB.deleteDatabase("marquette-tracker");
});

describe("store hydration", () => {
  it("hydrates with default settings and no data", async () => {
    const { store } = setup();
    await store.getState().hydrate();
    const s = state(store);
    expect(s.hydrated).toBe(true);
    expect(s.cycles).toEqual([]);
    expect(s.dayRecords).toEqual([]);
    expect(s.settings.postPeakDays).toBe(4);
    expect(s.settings.algorithmEnabled).toBe(true);
    expect(s.settings.goal).toBe("track-only");
  });

  it("defaults the calendar detail mode to simple and persists an explicit full choice", async () => {
    const db = createDb();
    const first = createAppStore(db);
    await first.getState().hydrate();
    expect(state(first).settings.calendarDetailMode).toBe("simple");

    await first.getState().updateSettings({ calendarDetailMode: "full" });

    const second = createAppStore(db);
    await second.getState().hydrate();
    expect(state(second).settings.calendarDetailMode).toBe("full");
  });

  it("fills a missing calendar detail mode from defaults for legacy settings", async () => {
    const db = createDb();
    const first = createAppStore(db);
    await first.getState().hydrate();
    const row = (await db.settings.get("main"))! as Partial<SettingsEntity>;
    const { calendarDetailMode: _dropped, ...legacy } = row;
    await db.settings.put(legacy as SettingsEntity);

    const second = createAppStore(db);
    await second.getState().hydrate();
    expect(state(second).settings.calendarDetailMode).toBe("simple");
  });

  it("defaults cycle projection to off", async () => {
    const { store } = setup();
    expect(state(store).settings.projectFutureCycles).toBe(false);
  });

  it("persists a cycle projection change across a restart", async () => {
    const db = createDb();
    const first = createAppStore(db);
    await first.getState().hydrate();
    await first.getState().updateSettings({ projectFutureCycles: true });

    const second = createAppStore(db);
    await second.getState().hydrate();
    expect(state(second).settings.projectFutureCycles).toBe(true);
  });

  it("fills a missing cycle projection value from defaults for legacy settings", async () => {
    const db = createDb();
    const first = createAppStore(db);
    await first.getState().hydrate();
    const row = (await db.settings.get("main"))! as Partial<SettingsEntity>;
    const { projectFutureCycles: _dropped, ...legacy } = row;
    await db.settings.put(legacy as SettingsEntity);

    const second = createAppStore(db);
    await second.getState().hydrate();
    expect(state(second).settings.projectFutureCycles).toBe(false);
  });
});

describe("day records", () => {
  it("upserts by cycle+date without creating duplicates", async () => {
    const { store } = setup();
    const { id: cycleId } = await store.getState().setNewCycle("2026-01-01");
    await store.getState().updateSettings({ algorithmEnabled: false });
    const put = store.getState().addDayRecord;
    await put(cycleId, "2026-01-10", 10, { monitor: "high" });
    await put(cycleId, "2026-01-10", 10, { monitor: "peak" });
    expect(state(store).dayRecords).toHaveLength(1);
    expect(state(store).dayRecords[0].monitor).toBe("peak");
    expect(state(store).dayRecords[0].version).toBe(2);
    expect(state(store).dayRecords[0].synced).toBe(false);
  });

  it("engine output recomputes when a peak is logged (end = peak + 4)", async () => {
    const { store } = setup();
    const { id: cycleId } = await store.getState().setNewCycle("2026-01-01");
    await store.getState().addDayRecord(cycleId, "2026-01-14", 14, { monitor: "peak" });
    const cycle = state(store).output?.cycles[0];
    expect(cycle?.fertileWindow.begin).toBe(6);
    expect(cycle?.fertileWindow.end).toBe(18);
    expect(cycle?.peakDay).toBe(14);
  });

  it("removing a day record reverts the derived window", async () => {
    const { store } = setup();
    const { id: cycleId } = await store.getState().setNewCycle("2026-01-01");
    await store.getState().addDayRecord(cycleId, "2026-01-14", 14, { monitor: "peak" });
    const recordId = state(store).dayRecords[0].id;
    await store.getState().removeDayRecord(recordId);
    expect(state(store).dayRecords).toHaveLength(0);
    expect(state(store).output?.cycles[0].fertileWindow.end).toBeNull();
  });
});

describe("cycles", () => {
  it("setNewCycle closes the open cycle at day1-1 and bumps cycleNo", async () => {
    const { store } = setup();
    const first = await store.getState().setNewCycle("2026-01-01");
    await store.getState().addDayRecord(first.id, "2026-01-20", 20, { monitor: "low" });
    const second = await store.getState().setNewCycle("2026-02-01");
    const s = state(store);
    expect(s.cycles).toHaveLength(2);
    expect(s.cycles[0].closedAt).toBe("2026-01-31");
    expect(s.cycles[1].cycleNo).toBe(2);
    expect(second.day1).toBe("2026-02-01");
    expect(s.cycles[1].day1).toBe("2026-02-01");
  });

  it("setNewCycle is a no-op when day1 is not later than the open cycle", async () => {
    const { store } = setup();
    await store.getState().setNewCycle("2026-01-01");
    await store.getState().setNewCycle("2026-01-01");
    expect(state(store).cycles).toHaveLength(1);
  });

  it("records land in their own cycle results", async () => {
    const { store } = setup();
    const first = await store.getState().setNewCycle("2026-01-01");
    const second = await store.getState().setNewCycle("2026-02-01");
    await store.getState().updateSettings({ algorithmEnabled: false });
    await store.getState().addDayRecord(first.id, "2026-01-14", 14, { monitor: "peak" });
    await store.getState().addDayRecord(second.id, "2026-02-12", 12, { monitor: "high" });
    const cycles = state(store).output!.cycles;
    expect(cycles).toHaveLength(2);
    expect(cycles[0].cycleNo).toBe(1);
    expect(cycles[1].length).toBeNull();
  });
});

describe("settings & data lifecycle", () => {
  it("changing postPeakDays recomputes the window", async () => {
    const { store } = setup();
    const { id: cycleId } = await store.getState().setNewCycle("2026-01-01");
    await store.getState().addDayRecord(cycleId, "2026-01-14", 14, { monitor: "peak" });
    expect(state(store).output!.cycles[0].fertileWindow.end).toBe(18);
    await store.getState().updateSettings({ postPeakDays: 6 });
    expect(state(store).settings.postPeakDays).toBe(6);
    expect(state(store).output!.cycles[0].fertileWindow.end).toBe(20);
  });

  it("persists across store instances (round trip)", async () => {
    const db = createDb();
    const first = createAppStore(db);
    await first.getState().hydrate();
    const { id } = await first.getState().setNewCycle("2026-01-01");
    await first.getState().addDayRecord(id, "2026-01-14", 14, { monitor: "peak" });

    const second = createAppStore(db);
    await second.getState().hydrate();
    const s = state(second);
    expect(s.cycles).toHaveLength(1);
    expect(s.cycles[0].day1).toBe("2026-01-01");
    expect(s.dayRecords[0].monitor).toBe("peak");
    expect(s.settings.postPeakDays).toBe(4);
  });

  it("keeps an explicitly persisted post-Peak value across a restart", async () => {
    const db = createDb();
    const first = createAppStore(db);
    await first.getState().hydrate();
    await first.getState().updateSettings({ postPeakDays: 3 });

    const second = createAppStore(db);
    await second.getState().hydrate();
    expect(state(second).settings.postPeakDays).toBe(3);
  });

  it("upgrades a legacy settings row without a persisted post-Peak value to the default", async () => {
    const db = createDb();
    const first = createAppStore(db);
    await first.getState().hydrate();
    // Simulate a row written before the setting existed: the repository must
    // fill the missing field from defaults instead of leaving it undefined.
    const row = (await db.settings.get("main"))! as Partial<SettingsEntity>;
    const { postPeakDays: _dropped, ...legacy } = row;
    await db.settings.put({ ...legacy, postPeakDays: 3 } as SettingsEntity);
    const withLegacyValue = createAppStore(db);
    await withLegacyValue.getState().hydrate();
    expect(state(withLegacyValue).settings.postPeakDays).toBe(3);

    await db.settings.put({ ...legacy } as SettingsEntity);
    const withoutValue = createAppStore(db);
    await withoutValue.getState().hydrate();
    expect(state(withoutValue).settings.postPeakDays).toBe(4);
  });

  it("clearAllData wipes everything and resets defaults", async () => {
    const { store } = setup();
    const { id: cycleId } = await store.getState().setNewCycle("2026-01-01");
    await store.getState().addDayRecord(cycleId, "2026-01-14", 14, { monitor: "peak" });
    await store.getState().updateSettings({ goal: "achieve-pregnancy" });
    await store.getState().clearAllData();
    const s = state(store);
    expect(s.cycles).toEqual([]);
    expect(s.dayRecords).toEqual([]);
    expect(s.output?.cycles).toEqual([]);
    expect(s.settings.goal).toBe("track-only");
  });
});
describe("cycle placement from logged days", () => {
  const march = (day: number) => `2026-03-${String(day).padStart(2, "0")}`;

  it("creates a cycle from backfilled days when the app is empty", async () => {
    const { store } = setup();
    await store.getState().addDayRecord("", march(1), 1, { bloodFlow: "medium" });
    await store.getState().addDayRecord("", march(2), 2, { bloodFlow: "light" });

    const s = state(store);
    expect(s.cycles).toHaveLength(1);
    expect(s.cycles[0].day1).toBe(march(1));
    expect(s.cycles[0].closedAt).toBeNull();
    expect(s.dayRecords.map((r) => r.dayInCycle)).toEqual([1, 2]);
    expect(s.dayRecords.every((r) => r.cycleId === s.cycles[0].id)).toBe(true);
  });

  it("merges an earlier menses day into a cycle logged later, moving Day 1 back", async () => {
    const { store } = setup();
    await store.getState().addDayRecord("", march(20), 1, { bloodFlow: "medium" });
    expect(state(store).cycles[0].day1).toBe(march(20));

    await store.getState().addDayRecord("", march(15), 1, { bloodFlow: "medium" });

    const s = state(store);
    expect(s.cycles).toHaveLength(1);
    expect(s.cycles[0].day1).toBe(march(15));
    expect(s.dayRecords.find((r) => r.date === march(15))!.dayInCycle).toBe(1);
    expect(s.dayRecords.find((r) => r.date === march(20))!.dayInCycle).toBe(6);
  });

  it("splits a new cycle when a menses day follows a logged no-menses day", async () => {
    const { store } = setup();
    await store.getState().addDayRecord("", march(1), 1, { bloodFlow: "medium" });
    await store.getState().addDayRecord("", march(4), 1, { monitor: "low" });
    await store.getState().addDayRecord("", march(10), 1, { bloodFlow: "heavy" });

    const s = state(store);
    expect(s.cycles.map((c) => c.day1)).toEqual([march(1), march(10)]);
    expect(s.cycles[0].closedAt).toBe(march(9));
    expect(s.cycles[1].closedAt).toBeNull();
    expect(s.dayRecords.find((r) => r.date === march(4))!.cycleId).toBe(s.cycles[0].id);
  });

  it("re-derives the live cycle instead of protecting it", async () => {
    const { store } = setup();
    // An in-progress cycle derived purely from logged days: menses 20 Mar, still
    // being logged on 25 Mar. Nothing declares it, so nothing shields it.
    await store.getState().addDayRecord("", march(20), 1, { bloodFlow: "heavy" });
    await store.getState().addDayRecord("", march(25), 6, { monitor: "low" });
    expect(state(store).cycles).toHaveLength(1);
    expect(state(store).cycles[0].day1).toBe(march(20));
    expect(state(store).cycles[0].closedAt).toBeNull();

    // Backfilling an earlier menses day that the rule groups with the live cycle.
    await store.getState().addDayRecord("", march(18), 1, { bloodFlow: "medium" });

    const s = state(store);
    // One open cycle, Day 1 moved back, no empty leftover for the old Day 1.
    expect(s.cycles).toHaveLength(1);
    expect(s.cycles[0].day1).toBe(march(18));
    expect(s.cycles[0].closedAt).toBeNull();
    expect(s.dayRecords.find((r) => r.date === march(18))!.dayInCycle).toBe(1);
    expect(s.dayRecords.find((r) => r.date === march(20))!.dayInCycle).toBe(3);
    expect(s.dayRecords.find((r) => r.date === march(25))!.dayInCycle).toBe(8);
    expect(s.dayRecords.every((r) => r.cycleId === s.cycles[0].id)).toBe(true);
  });

  it("keeps a declared cycle start as a boundary and honours its cycle days", async () => {
    const { store } = setup();
    const declared = await store.getState().setNewCycle(march(1));
    expect(declared.pinned).toBe(true);

    await store.getState().addDayRecord(declared.id, march(1), 1, { bloodFlow: "heavy" });
    await store.getState().addDayRecord(declared.id, march(14), 14, { monitor: "peak" });

    const s = state(store);
    expect(s.cycles).toHaveLength(1);
    expect(s.cycles[0].id).toBe(declared.id);
    expect(s.dayRecords.find((r) => r.date === march(14))!.dayInCycle).toBe(14);
  });

  it("renumbers cycles and leaves only the last one open", async () => {
    const { store } = setup();
    await store.getState().addDayRecord("", march(1), 1, { bloodFlow: "medium" });
    await store.getState().addDayRecord("", march(4), 1, { monitor: "low" });
    await store.getState().addDayRecord("", march(10), 1, { bloodFlow: "heavy" });

    const s = state(store);
    expect(s.cycles.map((c) => c.cycleNo)).toEqual([1, 2]);
    expect(s.cycles.filter((c) => c.closedAt === null)).toHaveLength(1);
  });

  it("feeds backfilled cycles into engine output and the forecast", async () => {
    const { store } = setup();
    // Derived cycles only: menses 1 Mar, logged no-menses 5 Mar, menses 12 Mar.
    await store.getState().addDayRecord("", march(1), 1, { bloodFlow: "medium" });
    await store.getState().addDayRecord("", march(5), 1, { monitor: "low" });
    await store.getState().addDayRecord("", march(12), 1, { bloodFlow: "heavy" });

    const output = state(store).output!;
    expect(output.cycles).toHaveLength(2);
    expect(output.cycles[0].day1).toBe(march(1));
    expect(output.cycles[0].length).toBe(11);
    // Day results now span the closed cycle rather than only logged days.
    expect(output.cycles[0].days).toHaveLength(11);
    expect(output.cycles[0].days.find((d) => d.day === 5)?.status).toBe("pre-fertile");
    expect(output.cycles[1].day1).toBe(march(12));
    expect(output.cycles[1].days[0].day).toBe(1);

    const forecast = output.forecast!;
    expect(forecast.basedOnCycles).toBe(1);
    expect(forecast.meanLength).toBe(11);
    expect(forecast.expectedPeriodStart).toBe("2026-03-23");
    expect(forecast.nextFertileWindow.begin).toBe("2026-03-17");
  });

  it("rejects a future date without writing a record", async () => {
    const { store } = setup();
    const tomorrow = addDays(new Date().toISOString().slice(0, 10), 1);
    await expect(
      store.getState().addDayRecord("", tomorrow, 1, { monitor: "high" }),
    ).rejects.toBeInstanceOf(FutureDateError);
    expect(state(store).dayRecords).toHaveLength(0);
  });

  it("re-derives the remaining structure after a delete", async () => {
    const { store } = setup();
    // M on 1 and 10 with a logged no-menses day on 4 between them: two cycles.
    await store.getState().addDayRecord("", march(1), 1, { bloodFlow: "medium" });
    await store.getState().addDayRecord("", march(4), 1, { monitor: "low" });
    await store.getState().addDayRecord("", march(10), 1, { bloodFlow: "heavy" });
    expect(state(store).cycles.map((c) => c.day1)).toEqual([march(1), march(10)]);

    // Removing the bridging no-menses day lets the menses days share one cycle.
    const bridge = state(store).dayRecords.find((r) => r.date === march(4))!;
    await store.getState().removeDayRecord(bridge.id);

    const s = state(store);
    expect(s.cycles.map((c) => c.day1)).toEqual([march(1)]);
    expect(s.dayRecords.find((r) => r.date === march(10))!.dayInCycle).toBe(10);
  });
});

describe("no generated records", () => {
  it("writes no day records on the post-Peak dates", async () => {
    const { store } = setup();
    const { id: cycleId } = await store.getState().setNewCycle("2026-01-01");
    await store.getState().addDayRecord(cycleId, "2026-01-12", 12, { monitor: "peak" });

    // Peak 12 + postPeakDays 4 -> the window ends on day 16.
    expect(state(store).dayRecords.map((r) => r.date)).toEqual(["2026-01-12"]);

    // The band is derived, not stored: days 13-16 are covered without rows.
    const cycle = state(store).output!.cycles[0];
    const byDay = new Map(cycle.days.map((d) => [d.day, d.status]));
    expect(byDay.get(13)).toBe("fertile");
    expect(byDay.get(16)).toBe("fertile");
    expect(byDay.get(17)).toBe("post-peak");
  });

  it("never writes a record carrying a data origin", async () => {
    const { store, db } = setup();
    const { id: cycleId } = await store.getState().setNewCycle("2026-01-01");
    await store.getState().addDayRecord(cycleId, "2026-01-12", 12, { monitor: "peak" });

    const stored = await db.dayRecords.toArray();
    for (const row of stored) {
      expect(row).not.toHaveProperty("dataOrigin");
      expect(row).not.toHaveProperty("inference");
    }
  });

  it("still regroups cycles from a backfilled menses boundary in one pass", async () => {
    const march = (day: number) => `2026-03-${String(day).padStart(2, "0")}`;
    const { store } = setup();
    await store.getState().addDayRecord("", march(1), 1, { bloodFlow: "medium" });
    await store.getState().addDayRecord("", march(4), 1, { monitor: "low" });
    await store.getState().addDayRecord("", march(10), 1, { bloodFlow: "heavy" });
    expect(state(store).cycles.map((c) => c.day1)).toEqual([march(1), march(10)]);

    const bridge = state(store).dayRecords.find((r) => r.date === march(4))!;
    await store.getState().removeDayRecord(bridge.id);

    const s = state(store);
    expect(s.cycles.map((c) => c.day1)).toEqual([march(1)]);
    expect(s.dayRecords.find((r) => r.date === march(10))!.dayInCycle).toBe(10);
    expect(s.dayRecords.every((r) => r.cycleId === s.cycles[0].id)).toBe(true);
  });
});

describe("autogenerated rows are removed when local data loads", () => {
  /** Seeds a row the previous release would have generated, straight into the DB. */
  async function seedLegacyRow(
    db: ReturnType<typeof createDb>,
    overrides: Record<string, unknown> = {},
  ) {
    await db.cycles.add({
      id: "legacy-cycle",
      cycleNo: 1,
      day1: "2026-01-01",
      closedAt: null,
      version: 1,
      synced: false,
      createdAt: "",
      updatedAt: "",
    } as never);
    await db.dayRecords.add({
      id: "legacy-low",
      cycleId: "legacy-cycle",
      date: "2026-01-19",
      dayInCycle: 19,
      monitor: "low",
      version: 1,
      synced: false,
      createdAt: "",
      updatedAt: "",
      dataOrigin: "inferred",
      ...overrides,
    } as never);
  }

  it("deletes a previously autogenerated row on hydrate", async () => {
    const { db, store } = setup();
    await seedLegacyRow(db);

    await store.getState().hydrate();

    expect(state(store).dayRecords.map((r) => r.id)).not.toContain("legacy-low");
  });

  it("retains a generated row the user edited", async () => {
    const { db, store } = setup();
    // An edit rewrites the row as user-authored, so it is no longer generated.
    await seedLegacyRow(db, { dataOrigin: "user" });

    await store.getState().hydrate();

    expect(state(store).dayRecords.map((r) => r.id)).toContain("legacy-low");
  });

  it("is safe to repeat", async () => {
    const { db, store } = setup();
    await seedLegacyRow(db);
    await store.getState().hydrate();
    const afterFirst = state(store).dayRecords.length;

    const second = createAppStore(db);
    await second.getState().hydrate();

    expect(state(second).dayRecords).toHaveLength(afterFirst);
  });

  it("removes only rows whose origin is exactly the autogenerated marker", async () => {
    // The removal runs unattended on every load with no undo, so anything that
    // is not precisely the marker must survive.
    const kept: Record<string, unknown>[] = [
      { id: "no-origin", date: "2026-01-20", dayInCycle: 20 },
      { id: "user-origin", date: "2026-01-21", dayInCycle: 21, dataOrigin: "user" },
      { id: "unknown-origin", date: "2026-01-22", dayInCycle: 22, dataOrigin: "inferredX" },
      { id: "null-origin", date: "2026-01-23", dayInCycle: 23, dataOrigin: null },
      { id: "empty-origin", date: "2026-01-24", dayInCycle: 24, dataOrigin: "" },
    ];
    const { db, store } = setup();
    await seedLegacyRow(db);
    for (const row of kept) {
      await db.dayRecords.add({
        cycleId: "legacy-cycle",
        monitor: "low",
        version: 1,
        synced: false,
        createdAt: "",
        updatedAt: "",
        ...row,
      } as never);
    }

    await store.getState().hydrate();

    const ids = state(store).dayRecords.map((r) => r.id);
    expect(ids).not.toContain("legacy-low");
    for (const row of kept) {
      expect(ids, `${row.id} must survive`).toContain(row.id);
    }
  });
});
