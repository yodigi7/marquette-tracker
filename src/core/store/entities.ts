import type { DataOrigin, DateKey, Goal, PostPeakFillMode, PostPeakInference, PostPeakSuppression, Theme } from '@/core/engine/types'

/** Sync/version bookkeeping attached to every row (AGENTS.md sync-ready path). */
export interface SyncMeta {
  version: number
  synced: boolean
  createdAt: string
  updatedAt: string
}

export interface CycleEntity extends SyncMeta {
  id: string
  day1: DateKey
  cycleNo: number
  closedAt: DateKey | null
  notes: string
  /** Declared via "Start a new cycle": day1 always opens a cycle during placement. */
  pinned?: boolean
}

export interface DayRecordEntity extends SyncMeta {
  id: string
  cycleId: string
  date: DateKey
  dayInCycle: number
  monitor?: 'none' | 'low' | 'high' | 'peak'
  mucus?: 'none' | 'low' | 'high' | 'peak'
  bloodFlow?: 'none' | 'light' | 'medium' | 'heavy'
  /** Absent on legacy rows; legacy records are treated as user-authored. */
  dataOrigin?: DataOrigin
  inference?: PostPeakInference
  intercourse?: boolean
  intercourseTime?: string
  bbt?: number | null
  symptoms?: string[]
  pregnancyTest?: 'negative' | 'positive'
  notes?: string
}

export type WeekStart = 'monday' | 'sunday'

export interface SettingsEntity extends SyncMeta {
  key: 'main'
  goal: Goal
  algorithmEnabled: boolean
  postPeakDays: number
  historyWindow: number
  theme: Theme
  weekStart: WeekStart
  cycleMinLength: number
  cycleMaxLength: number
  postPeakFillMode: PostPeakFillMode
  postPeakSuppressions: PostPeakSuppression[]
  overlayMucus: boolean
  overlayBbt: boolean
  overlayIntercourse: boolean
  /** TEMPORARY: one-shot marker so demo data is loaded only on first startup. */
  demoSeeded: boolean
}

export const SETTINGS_KEY = 'main' as const

export const DEFAULT_SETTINGS: Omit<SettingsEntity, keyof SyncMeta> = {
  key: SETTINGS_KEY,
  goal: 'track-only',
  algorithmEnabled: true,
  postPeakDays: 4,
  historyWindow: 6,
  theme: 'system',
  weekStart: 'monday',
  cycleMinLength: 21,
  cycleMaxLength: 42,
  postPeakFillMode: 'auto-after-window',
  postPeakSuppressions: [],
  overlayMucus: false,
  overlayBbt: false,
  overlayIntercourse: false,
  demoSeeded: false,
}