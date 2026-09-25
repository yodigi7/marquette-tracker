import { create } from 'zustand'
import { createBackup as createBackupDocument, prepareBackupDocument } from '@/core/backup'
import type { BackupDocument, BackupRestoreResult, PreparedBackup } from '@/core/backup'
import { addDays } from '@/core/engine/dateUtils'
import { computeAll } from '@/core/engine/engineSdk'
import type { EngineOutput } from '@/core/engine/engineSdk'
import { planCycles, isMensesFlow, type PlacedDay } from '@/core/engine/placement'
import { planPostPeakFill, type PostPeakFillCycle, type PostPeakFillDay } from '@/core/engine/postPeakFill'
import type { DateKey, PostPeakSuppression } from '@/core/engine/types'
import { dayInCycle, todayKey } from '@/core/dateKeys'
import type { AppDb } from './db'
import { db } from './db'
import { DEFAULT_SETTINGS } from './entities'
import type { CycleEntity, DayRecordEntity, SettingsEntity } from './entities'
import { createRepositories } from './repositories'
import { recordsForMode } from './selectors'

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
  createBackup(): Promise<BackupDocument>
  restoreBackup(prepared: PreparedBackup): Promise<BackupRestoreResult>
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
      const output = computeAll(cycles, recordsForMode(dayRecords, settings.algorithmEnabled), engineSettingsOf(settings))
      set({ cycles, dayRecords, settings, output, ...next })
    }

    async function reconcileCycleRows(
      placementRecords: DayRecordEntity[],
      allRecords: DayRecordEntity[],
      options: { preserveMeta?: boolean } = {},
    ) {
      const existing = await db.cycles.toArray()
      const plans = planCycles(
        placementRecords.map(toPlacedDay),
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
          if (options.preserveMeta) {
            await db.cycles.update(byDay1[index].id, { closedAt })
          } else {
            await repos.cycles.updateClosedAt(byDay1[index].id, closedAt)
          }
        }
        if (current && current.cycleNo !== index + 1) {
          if (options.preserveMeta) {
            await db.cycles.update(byDay1[index].id, { cycleNo: index + 1 })
          } else {
            await repos.cycles.update(byDay1[index].id, { cycleNo: index + 1 })
          }
        }
      }

      const idFor = new Map(byDay1.map((entry) => [entry.day1, entry.id]))
      for (const record of allRecords) {
        const owner = ownerOf(plans, record.date)
        if (!owner) {
          continue
        }
        const cycleId = idFor.get(owner.plan.day1) ?? ''
        if (cycleId && (record.cycleId !== cycleId || record.dayInCycle !== owner.day)) {
          if (options.preserveMeta) {
            await db.dayRecords.update(record.id, { cycleId, dayInCycle: owner.day })
          } else {
            await repos.days.update(record.id, { cycleId, dayInCycle: owner.day })
          }
        }
      }

      const live = new Set(byDay1.map((entry) => entry.id))
      for (const cycle of existing) {
        if (!live.has(cycle.id)) {
          await db.cycles.delete(cycle.id)
        }
      }
    }

    async function suppressionFor(record: DayRecordEntity): Promise<PostPeakSuppression | null> {
      if (record.dataOrigin !== 'inferred' || !record.inference) {
        return null
      }
      const cycle =
        (await db.cycles.get(record.cycleId)) ??
        (await db.cycles.toArray())
          .filter((item) => item.day1 <= record.date)
          .sort((a, b) => (a.day1 < b.day1 ? -1 : 1))
          .at(-1)
      if (!cycle) {
        return null
      }
      return {
        date: record.date,
        cycleId: cycle.id,
        cycleDay1: cycle.day1,
        peakDay: record.inference.peakDay,
        postPeakDays: record.inference.postPeakDays,
        mode: record.inference.mode,
      }
    }

    async function clearSuppressionsForDate(date: DateKey) {
      const settings = await repos.settings.get()
      if (!settings.postPeakSuppressions.some((suppression) => suppression.date === date)) {
        return
      }
      await repos.settings.update({
        postPeakSuppressions: settings.postPeakSuppressions.filter((suppression) => suppression.date !== date),
      })
    }

    async function reconcileGeneratedRecordsInTransaction(options: { preserveMeta?: boolean } = {}) {
      const allRecords = await db.dayRecords.toArray()
      const settings = await repos.settings.get()
      const userPlacementRecords = recordsForMode(allRecords, false)
      const assignmentRecords = settings.algorithmEnabled ? allRecords : userPlacementRecords

      // User evidence determines boundaries first. Generated rows are assigned
      // only after placement when interpretation is enabled; while it is off,
      // they remain stored and untouched.
      await reconcileCycleRows(userPlacementRecords, assignmentRecords, options)

      if (!settings.algorithmEnabled) {
        return
      }

      const cycles = await db.cycles.toArray()
      const records = await db.dayRecords.toArray()
      const output = computeAll(cycles, records, engineSettingsOf(settings))
      const results = new Map(output.cycles.map((result) => [result.cycleId, result]))
      const sortedCycles = [...cycles].sort((a, b) => (a.day1 < b.day1 ? -1 : 1))
      const fillCycles: PostPeakFillCycle[] = sortedCycles.map((cycle, index) => ({
        id: cycle.id,
        day1: cycle.day1,
        nextDay1: sortedCycles[index + 1]?.day1 ?? null,
        monitorPeakDay: results.get(cycle.id)?.peakDay ?? null,
      }))
      const fillRecords: PostPeakFillDay[] = records.map((record) => ({
        id: record.id,
        cycleId: record.cycleId,
        date: record.date,
        dayInCycle: record.dayInCycle,
        monitor: record.monitor,
        mucus: record.mucus,
        dataOrigin: record.dataOrigin,
        inference: record.inference,
      }))
      const plan = planPostPeakFill({
        cycles: fillCycles,
        records: fillRecords,
        mode: settings.postPeakFillMode,
        postPeakDays: settings.postPeakDays,
        today: todayKey(),
        suppressions: settings.postPeakSuppressions,
      })

      for (const id of plan.staleIds) {
        await repos.days.remove(id)
      }
      for (const item of plan.generated) {
        if (item.existingId) {
          const patch = {
            cycleId: item.cycleId,
            dayInCycle: item.dayInCycle,
            monitor: item.monitor,
            dataOrigin: item.dataOrigin,
            inference: item.inference,
          }
          if (options.preserveMeta) {
            await db.dayRecords.update(item.existingId, patch)
          } else {
            await repos.days.update(item.existingId, patch)
          }
        } else {
          await repos.days.upsert(item.cycleId, item.date, item.dayInCycle, {
            monitor: item.monitor,
            dataOrigin: item.dataOrigin,
            inference: item.inference,
          })
        }
      }

      // Re-assignment after generation still derives boundaries from user-only
      // evidence; generated rows are updated in place, never re-placed.
      const finalRecords = await db.dayRecords.toArray()
      await reconcileCycleRows(userPlacementRecords, finalRecords, options)
    }

    async function reconcileGeneratedRecords() {
      await db.transaction('rw', db.cycles, db.dayRecords, db.settings, () => reconcileGeneratedRecordsInTransaction())
      await refresh()
    }

    async function runMutationWithReconciliation<T>(mutate: () => Promise<T>): Promise<T> {
      let result!: T
      await db.transaction('rw', db.cycles, db.dayRecords, db.settings, async () => {
        result = await mutate()
        await reconcileGeneratedRecordsInTransaction()
      })
      await refresh()
      return result
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
        await refresh()
        await reconcileGeneratedRecords()
        set({ hydrated: true })
      },

      async addDayRecord(cycleId, date, dayInCycle, patch) {
        if (date > todayKey()) {
          throw new FutureDateError()
        }
        await runMutationWithReconciliation(async () => {
          const records = await db.dayRecords.toArray()
          const existing = records.find((record) => record.date === date)
          if (existing) {
            await repos.days.update(existing.id, { ...patch, dataOrigin: 'user' })
          } else {
            await repos.days.upsert(cycleId, date, dayInCycle, { ...patch, dataOrigin: 'user' })
          }
          await clearSuppressionsForDate(date)
        })
      },

      async removeDayRecord(id) {
        await runMutationWithReconciliation(async () => {
          const record = await db.dayRecords.get(id)
          if (record) {
            const suppression = await suppressionFor(record)
            if (suppression) {
              const settings = await repos.settings.get()
              await repos.settings.update({
                postPeakSuppressions: [
                  ...settings.postPeakSuppressions.filter((item) => item.date !== suppression.date),
                  suppression,
                ],
              })
            }
          }
          await repos.days.remove(id)
        })
      },

      async setNewCycle(day1) {
        return runMutationWithReconciliation(async () => {
          const cycles = await repos.cycles.list()
          const latest = cycles[cycles.length - 1]
          if (latest && latest.closedAt === null) {
            if (day1 <= latest.day1) {
              return latest
            }
            await repos.cycles.updateClosedAt(latest.id, addDays(day1, -1))
          }
          return repos.cycles.create({ day1, pinned: true })
        })
      },

      async updateSettings(patch) {
        await runMutationWithReconciliation(() => repos.settings.update(patch))
      },

      async createBackup() {
        return createBackupDocument(await repos.snapshot())
      },

      async restoreBackup(prepared) {
        const validated = prepareBackupDocument(prepared.document)
        await db.transaction('rw', db.cycles, db.dayRecords, db.settings, async () => {
          await repos.replaceAll({
            ...validated.document.data,
            settings: { ...validated.document.data.settings, demoSeeded: true },
          })
          await reconcileGeneratedRecordsInTransaction({ preserveMeta: true })
        })
        await refresh({ hydrated: true })
        return {
          cycleCount: validated.summary.cycleCount,
          dayRecordCount: validated.summary.dayRecordCount,
        }
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
