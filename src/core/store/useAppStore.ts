import { create } from 'zustand'
import { addDays } from '@/core/engine/dateUtils'
import { computeAll } from '@/core/engine/engineSdk'
import type { EngineOutput } from '@/core/engine/engineSdk'
import type { DateKey } from '@/core/engine/types'
import type { AppDb } from './db'
import { db } from './db'
import { DEFAULT_SETTINGS } from './entities'
import type { CycleEntity, DayRecordEntity, SettingsEntity } from './entities'
import { createRepositories } from './repositories'

export interface AppState {
  hydrated: boolean
  cycles: CycleEntity[]
  dayRecords: DayRecordEntity[]
  settings: SettingsEntity
  output: EngineOutput | null
  hydrate(): Promise<void>
  addDayRecord(cycleId: string, date: DateKey, dayInCycle: number, patch: Partial<DayRecordEntity>): Promise<void>
  removeDayRecord(id: string): Promise<void>
  setNewCycle(day1: DateKey): Promise<CycleEntity>
  updateSettings(patch: Omit<Partial<SettingsEntity>, 'key'>): Promise<void>
  clearAllData(): Promise<void>
}

function engineSettingsOf(settings: SettingsEntity) {
  return {
    postPeakDays: settings.postPeakDays,
    historyWindow: settings.historyWindow,
    cycleMinLength: settings.cycleMinLength,
    cycleMaxLength: settings.cycleMaxLength,
  }
}

export function createAppStore(db: AppDb) {
  const repos = createRepositories(db)

  return create<AppState>()((set, get) => {
    async function refresh(next: Partial<AppState> = {}) {
      const [cycles, dayRecords, settings] = await Promise.all([
        repos.cycles.list(),
        db.dayRecords.toArray(),
        repos.settings.get(),
      ])
      const output = computeAll(cycles, dayRecords, engineSettingsOf(settings))
      set({ cycles, dayRecords, settings, output, ...next })
    }

    return {
      hydrated: false,
      cycles: [],
      dayRecords: [],
      settings: {
        ...DEFAULT_SETTINGS,
        version: 0,
        synced: false,
        createdAt: '',
        updatedAt: '',
      },

      output: null,

      async hydrate() {
        if (get().hydrated) {
          return
        }
        await refresh({ hydrated: true })
      },

      async addDayRecord(cycleId, date, dayInCycle, patch) {
        await repos.days.upsert(cycleId, date, dayInCycle, patch)
        await refresh()
      },

      async removeDayRecord(id) {
        await repos.days.remove(id)
        await refresh()
      },

      async setNewCycle(day1) {
        const cycles = await repos.cycles.list()
        const latest = cycles[cycles.length - 1]
        if (latest && latest.closedAt === null) {
          if (day1 <= latest.day1) {
            return latest
          }
          await repos.cycles.updateClosedAt(latest.id, addDays(day1, -1))
        }
        const created = await repos.cycles.create({ day1 })
        await refresh()
        return created
      },

      async updateSettings(patch) {
        await repos.settings.update(patch)
        await refresh()
      },

      async clearAllData() {
        await repos.clearAll()
        await repos.settings.update({ demoSeeded: true })
        await refresh({ hydrated: true })
      },
    }
  })
}

/** App-wide singleton. Tests construct their own instance with a fresh DB. */
export const useAppStore = createAppStore(db)