import type { BackupSnapshot } from '@/core/backup/types'
import type { DateKey } from '@/core/engine/types'
import type { CycleEntity, DayRecordEntity, SettingsEntity, SyncMeta } from './entities'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './entities'
import type { AppDb } from './db'

function nowIso(): string {
  return new Date().toISOString()
}

export function newUuid(): string {
  // Node ≥ 19 and all modern browsers provide crypto.randomUUID.
  return crypto.randomUUID()
}

function freshMeta(): SyncMeta {
  const stamp = nowIso()
  return { version: 1, synced: false, createdAt: stamp, updatedAt: stamp }
}

function defaultSettings(): SettingsEntity {
  return { ...DEFAULT_SETTINGS, ...freshMeta() }
}

/** Increment version + clear sync flag (sync-ready bookkeeping on every write). */
function bumpPatch(current: { version: number }): { version: number; synced: boolean; updatedAt: string } {
  return { version: current.version + 1, synced: false, updatedAt: nowIso() }
}

export type CyclePatch = Partial<Pick<CycleEntity, 'day1' | 'closedAt' | 'cycleNo' | 'notes' | 'pinned'>>

export interface CycleRepository {
  list(): Promise<CycleEntity[]>
  get(id: string): Promise<CycleEntity | undefined>
  create(input: { day1: DateKey; notes?: string; pinned?: boolean }): Promise<CycleEntity>
  updateClosedAt(id: string, closedAt: DateKey | null): Promise<void>
  update(id: string, patch: CyclePatch): Promise<void>
}

export type DayRecordPatch = Partial<Omit<DayRecordEntity, 'id' | keyof SyncMeta>>

export interface DayRecordRepository {
  listByCycle(cycleId: string): Promise<DayRecordEntity[]>
  getByDate(cycleId: string, date: DateKey): Promise<DayRecordEntity | undefined>
  upsert(
    cycleId: string,
    date: DateKey,
    dayInCycle: number,
    patch: Partial<DayRecordEntity>,
  ): Promise<DayRecordEntity>
  update(id: string, patch: DayRecordPatch): Promise<void>
  remove(id: string): Promise<void>
}

export interface SettingsRepository {
  get(): Promise<SettingsEntity>
  update(patch: Omit<Partial<SettingsEntity>, 'key'>): Promise<SettingsEntity>
}

export interface Repositories {
  cycles: CycleRepository
  days: DayRecordRepository
  settings: SettingsRepository
  /** Read a consistent source snapshot for backup export. */
  snapshot(): Promise<BackupSnapshot>
  /** Replace all tables inside the caller's transaction. */
  replaceAll(snapshot: BackupSnapshot): Promise<void>
  clearAll(): Promise<void>
}

export function createRepositories(db: AppDb): Repositories {
  const cycles: CycleRepository = {
    async list() {
      return db.cycles.orderBy('day1').toArray()
    },
    async get(id) {
      return db.cycles.get(id)
    },
    async create(input) {
      const all = await db.cycles.toArray()
      const maxCycleNo = all.reduce((max, c) => Math.max(max, c.cycleNo), 0)
      const entity: CycleEntity = {
        id: newUuid(),
        day1: input.day1,
        cycleNo: maxCycleNo + 1,
        closedAt: null,
        notes: input.notes ?? '',
        pinned: input.pinned ?? false,
        ...freshMeta(),
      }
      await db.cycles.add(entity)
      return entity
    },
    async updateClosedAt(id, closedAt) {
      const current = await db.cycles.get(id)
      if (!current) {
        return
      }
      await db.cycles.update(id, { closedAt, ...bumpPatch(current) })
    },
    async update(id, patch) {
      const current = await db.cycles.get(id)
      if (!current) {
        return
      }
      await db.cycles.update(id, { ...patch, ...bumpPatch(current) })
    },
  }

  const days: DayRecordRepository = {
    async listByCycle(cycleId) {
      return db.dayRecords.where('cycleId').equals(cycleId).sortBy('dayInCycle')
    },
    async getByDate(cycleId, date) {
      return db.dayRecords.where('[cycleId+date]').equals([cycleId, date]).first()
    },
    async upsert(cycleId, date, dayInCycle, patch) {
      const existing = await days.getByDate(cycleId, date)
      if (existing) {
        await db.dayRecords.update(existing.id, { ...patch, dayInCycle, ...bumpPatch(existing) })
        return (await db.dayRecords.get(existing.id))!
      }
      const entity: DayRecordEntity = {
        id: newUuid(),
        cycleId,
        date,
        dayInCycle,
        ...freshMeta(),
        ...patch,
      }
      await db.dayRecords.add(entity)
      return entity
    },
    async update(id, patch) {
      const current = await db.dayRecords.get(id)
      if (!current) {
        return
      }
      await db.dayRecords.update(id, { ...patch, ...bumpPatch(current) })
    },
    async remove(id) {
      await db.dayRecords.delete(id)
    },
  }

  const settings: SettingsRepository = {
    async get() {
      const row = await db.settings.get(SETTINGS_KEY)
      if (row) {
        // Merge defaults so settings introduced after a database was created
        // are available without requiring a destructive schema migration.
        return { ...DEFAULT_SETTINGS, ...row }
      }
      const defaults = defaultSettings()
      await db.settings.add(defaults)
      return defaults
    },
    async update(patch) {
      const current = await settings.get()
      await db.settings.update(SETTINGS_KEY, { ...patch, ...bumpPatch(current) })
      return (await db.settings.get(SETTINGS_KEY))!
    },
  }

  return {
    cycles,
    days,
    settings,
    async snapshot() {
      return db.transaction('r', db.cycles, db.dayRecords, db.settings, async () => {
        const [cycles, dayRecords, storedSettings] = await Promise.all([
          db.cycles.orderBy('day1').toArray(),
          db.dayRecords.orderBy('date').toArray(),
          db.settings.get(SETTINGS_KEY),
        ])
        return {
          cycles,
          dayRecords,
          settings: storedSettings ?? defaultSettings(),
        }
      })
    },
    async replaceAll(snapshot) {
      await db.cycles.clear()
      await db.dayRecords.clear()
      await db.settings.clear()
      if (snapshot.cycles.length > 0) {
        await db.cycles.bulkPut(snapshot.cycles)
      }
      if (snapshot.dayRecords.length > 0) {
        await db.dayRecords.bulkPut(snapshot.dayRecords)
      }
      await db.settings.put({ ...snapshot.settings, key: SETTINGS_KEY, synced: false })
    },
    async clearAll() {
      await db.transaction('rw', db.cycles, db.dayRecords, db.settings, async () => {
        await db.cycles.clear()
        await db.dayRecords.clear()
        await db.settings.clear()
      })
    },
  }
}