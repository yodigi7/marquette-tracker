import { create } from 'zustand'
import { addDays } from '@/core/engine/dateUtils'
import { computeAll } from '@/core/engine/engineSdk'
import type { EngineOutput } from '@/core/engine/engineSdk'
import { planCycles, isMensesFlow, type PlacedDay } from '@/core/engine/placement'
import type { DateKey } from '@/core/engine/types'
import { dayInCycle, todayKey } from '@/core/dateKeys'
import type { AppDb } from './db'
import { db } from './db'
import { DEFAULT_SETTINGS } from './entities'
import type { CycleEntity, DayRecordEntity, SettingsEntity } from './entities'
import { createRepositories } from './repositories'

export class FutureDateError extends Error {
  constructor() {
    super('Future dates cannot be logged')
    this.name = 'FutureDateError'
  }
}

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

function toPlacedDay(record: DayRecordEntity): PlacedDay {
  return { date: record.date, menses: isMensesFlow(record.bloodFlow) }
}

/** Assign a record to the plan that owns its date, and derive its cycle day. */
function ownerOf(plans: { day1: DateKey; dates: DateKey[] }[], date: DateKey) {
  for (let index = plans.length - 1; index >= 0; index--) {
    if (plans[index].day1 <= date) {
      return { plan: plans[index], day: dayInCycle(plans[index].day1, date) }
    }
  }
  return null
}

export function createAppStore(db: AppDb) {
  const repos = createRepositories(db)

  return create<AppState>()((set, get) => {
    async function refresh(next: Partial<AppState> = {}) {
      const [cycles, records, settings] = await Promise.all([
        repos.cycles.list(),
        db.dayRecords.toArray(),
        repos.settings.get(),
      ])
      const dayRecords = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      const output = computeAll(cycles, dayRecords, engineSettingsOf(settings))
      set({ cycles, dayRecords, settings, output, ...next })
    }

    /**
     * Re-derives the whole cycle structure from the raw records, in one pass, inside a
     * single transaction. No cycle is protected: a write may move a Day 1, merge two
     * cycles, or split one. Declared cycle starts (pinned) always open a cycle and are
     * kept even while empty.
     */
    async function replan() {
      await db.transaction('rw', db.cycles, db.dayRecords, async () => {
        const records = await db.dayRecords.toArray()
        const existing = await db.cycles.toArray()
        const plans = planCycles(
          records.map(toPlacedDay),
          existing.filter((cycle) => cycle.pinned).map((cycle) => cycle.day1),
        )

        // A declared start owns a cycle even with no records: add any plan the walk missed.
        for (const cycle of existing) {
          if (cycle.pinned && !plans.some((plan) => plan.day1 === cycle.day1)) {
            plans.push({ day1: cycle.day1, dates: [] })
          }
        }
        plans.sort((a, b) => (a.day1 < b.day1 ? -1 : 1))

        const pinned = existing.filter((cycle) => cycle.pinned)
        const taken = new Set<string>()
        // Reuse the existing row that already owns a day1, preferring a declared
        // start, so cycle ids stay stable while the structure is re-derived.
        const matchFor = (day1: DateKey) =>
          pinned.find((cycle) => cycle.day1 === day1 && !taken.has(cycle.id)) ??
          existing.find((cycle) => cycle.day1 === day1 && !taken.has(cycle.id))

        const byDay1: { day1: DateKey; id: string }[] = []
        for (const plan of plans) {
          const match = matchFor(plan.day1)
          if (match) {
            taken.add(match.id)
          }
          byDay1.push({ day1: plan.day1, id: match ? match.id : '' })
        }
        for (const entry of byDay1) {
          if (entry.id) {
            continue
          }
          const created = await repos.cycles.create({ day1: entry.day1 })
          entry.id = created.id
        }

        // Last cycle stays open; every earlier one closes the day before the next begins.
        for (let index = 0; index < byDay1.length; index++) {
          const next = byDay1[index + 1]
          const closedAt = next ? addDays(next.day1, -1) : null
          const current = await db.cycles.get(byDay1[index].id)
          if (current && current.closedAt !== closedAt) {
            await repos.cycles.updateClosedAt(byDay1[index].id, closedAt)
          }
          if (current && current.cycleNo !== index + 1) {
            await repos.cycles.update(byDay1[index].id, { cycleNo: index + 1 })
          }
        }

        const idFor = new Map(byDay1.map((entry) => [entry.day1, entry.id]))
        for (const record of records) {
          const owner = ownerOf(plans, record.date)
          if (!owner) {
            continue
          }
          const cycleId = idFor.get(owner.plan.day1) ?? ''
          if (record.cycleId !== cycleId || record.dayInCycle !== owner.day) {
            await repos.days.update(record.id, { cycleId, dayInCycle: owner.day })
          }
        }

        const live = new Set(byDay1.map((entry) => entry.id))
        for (const cycle of existing) {
          if (!live.has(cycle.id)) {
            await db.cycles.delete(cycle.id)
          }
        }
      })

      await refresh()
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
        if (date > todayKey()) {
          throw new FutureDateError()
        }
        const records = await db.dayRecords.toArray()
        const existing = records.find((record) => record.date === date)
        if (existing) {
          await repos.days.update(existing.id, patch)
        } else {
          await repos.days.upsert(cycleId, date, dayInCycle, patch)
        }
        await replan()
      },

      async removeDayRecord(id) {
        await repos.days.remove(id)
        await replan()
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
        const created = await repos.cycles.create({ day1, pinned: true })
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
