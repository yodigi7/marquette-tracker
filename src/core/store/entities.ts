import type { DateKey, Goal, Theme } from '@/core/engine/types'

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
}

export interface DayRecordEntity extends SyncMeta {
  id: string
  cycleId: string
  date: DateKey
  dayInCycle: number
  monitor?: 'none' | 'low' | 'high' | 'peak'
  mucus?: 'none' | 'low' | 'high' | 'peak'
  bloodFlow?: 'none' | 'light' | 'medium' | 'heavy'
  intercourse?: boolean
  intercourseTime?: string
  bbt?: number | null
  symptoms?: string[]
  pregnancyTest?: 'negative' | 'positive'
  notes?: string
}

export interface SettingsEntity extends SyncMeta {
  key: 'main'
  goal: Goal
  algorithmEnabled: boolean
  postPeakDays: number
  historyWindow: number
  theme: Theme
}

export const SETTINGS_KEY = 'main' as const

export const DEFAULT_SETTINGS: Omit<SettingsEntity, keyof SyncMeta> = {
  key: SETTINGS_KEY,
  goal: 'track-only',
  algorithmEnabled: true,
  postPeakDays: 3,
  historyWindow: 6,
  theme: 'system',
}