import type { CycleEntity, DayRecordEntity, SettingsEntity } from '@/core/store/entities'

export const BACKUP_FORMAT = 'marquette-tracker-backup' as const
export const CURRENT_BACKUP_VERSION = 1 as const

export type BackupErrorCode =
  | 'invalid-json'
  | 'invalid-format'
  | 'unsupported-format'
  | 'invalid-document'
  | 'duplicate-id'
  | 'invalid-settings'
  | 'invalid-record'
  | 'invalid-cycle'
  | 'duplicate-date'
  | 'future-date'

export class BackupError extends Error {
  readonly code: BackupErrorCode

  constructor(code: BackupErrorCode, message: string) {
    super(message)
    this.name = 'BackupError'
    this.code = code
  }
}

export interface BackupSnapshot {
  cycles: CycleEntity[]
  dayRecords: DayRecordEntity[]
  settings: SettingsEntity
}

export interface BackupData {
  cycles: CycleEntity[]
  dayRecords: DayRecordEntity[]
  settings: SettingsEntity
}

export interface BackupDocument {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  appVersion: string
  exportedAt: string
  data: BackupData
}

export interface BackupSummary {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  appVersion: string
  exportedAt: string
  cycleCount: number
  dayRecordCount: number
  settingsIncluded: boolean
}

export interface PreparedBackup {
  document: BackupDocument
  summary: BackupSummary
}

export interface BackupRestoreResult {
  cycleCount: number
  dayRecordCount: number
}

export interface BackupOptions {
  appVersion?: string
  exportedAt?: string
}

export interface PrepareOptions {
  today?: string
}
