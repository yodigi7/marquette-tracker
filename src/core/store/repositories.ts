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

/** Increment version + clear sync flag (sync-ready bookkeeping on every write). */
function bumpPatch(current: { version: number }): { version: number; synced: boolean; updatedAt: string } {
  return { version: current.version + 1, synced: false, updatedAt: nowIso() }
}

export interface CycleRepository {
  list(): Promise<CycleEntity[]>
  get(id: string): Promise<CycleEntity | undefined>
  create(input: { day1: DateKey; notes?: string }): Promise<CycleEntity>
  updateClosedAt(id: string, closedAt: DateKey | null): Promise<void>
}

export interface DayRecordRepository {
  listByCycle(cycleId: string): Promise<DayRecordEntity[]>
  getByDate(cycleId: string, date: DateKey): Promise<DayRecordEntity | undefined>
  upsert(
    cycleId: string,
    date: DateKey,
    dayInCycle: number,
    patch: Partial<DayRecordEntity>,
  ): Promise<DayRecordEntity>
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
    async remove(id) {
      await db.dayRecords.delete(id)
    },
  }

  const settings: SettingsRepository = {
    async get() {
      const row = await db.settings.get(SETTINGS_KEY)
      if (row) {
        return row
      }
      const defaults: SettingsEntity = { ...DEFAULT_SETTINGS, ...freshMeta() }
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
    async clearAll() {
      await db.transaction('rw', db.cycles, db.dayRecords, db.settings, async () => {
        await db.cycles.clear()
        await db.dayRecords.clear()
        await db.settings.clear()
      })
    },
  }
}