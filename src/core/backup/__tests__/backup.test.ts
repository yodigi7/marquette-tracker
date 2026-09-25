import { describe, expect, it } from 'vitest'
import type { CycleEntity, DayRecordEntity, SettingsEntity } from '@/core/store/entities'
import { DEFAULT_SETTINGS } from '@/core/store/entities'
import {
  BACKUP_FORMAT,
  CURRENT_BACKUP_VERSION,
  BackupError,
  createBackup,
  getBackupSummary,
  prepareBackup,
  serializeBackup,
} from '../index'

const createdAt = '2026-01-01T00:00:00.000Z'
const updatedAt = '2026-01-02T00:00:00.000Z'

function meta(overrides: Partial<SyncMeta> = {}): SyncMeta {
  return {
    version: 3,
    synced: true,
    createdAt,
    updatedAt,
    ...overrides,
  }
}

interface SyncMeta {
  version: number
  synced: boolean
  createdAt: string
  updatedAt: string
}

function cycle(overrides: Partial<CycleEntity> = {}): CycleEntity {
  return {
    id: 'cycle-1',
    day1: '2026-01-01',
    cycleNo: 1,
    closedAt: null,
    notes: 'first cycle',
    pinned: true,
    ...meta(),
    ...overrides,
  }
}

function dayRecord(overrides: Partial<DayRecordEntity> = {}): DayRecordEntity {
  return {
    id: 'day-1',
    cycleId: 'cycle-1',
    date: '2026-01-10',
    dayInCycle: 10,
    monitor: 'peak',
    dataOrigin: 'user',
    ...meta(),
    ...overrides,
  }
}

function settings(overrides: Partial<SettingsEntity> = {}): SettingsEntity {
  return {
    ...DEFAULT_SETTINGS,
    key: 'main',
    ...meta(),
    ...overrides,
  }
}

function snapshot(overrides: Partial<Parameters<typeof createBackup>[0]> = {}) {
  return {
    cycles: [cycle()],
    dayRecords: [dayRecord()],
    settings: settings(),
    ...overrides,
  }
}

describe('JSON backup contract', () => {
  it('creates a readable versioned envelope without derived output', () => {
    const document = createBackup(snapshot(), {
      appVersion: '1.2.3',
      exportedAt: '2026-02-03T04:05:06.000Z',
    })

    expect(document).toMatchObject({
      format: BACKUP_FORMAT,
      formatVersion: CURRENT_BACKUP_VERSION,
      appVersion: '1.2.3',
      exportedAt: '2026-02-03T04:05:06.000Z',
    })
    expect(document.data.cycles).toHaveLength(1)
    expect(document.data.dayRecords).toHaveLength(1)
    expect(document.data.settings.key).toBe('main')
    expect(document).not.toHaveProperty('data.output')
    expect(serializeBackup(document)).toContain('\n  "format"')
  })

  it('round-trips identity, content, metadata, and provenance while resetting sync flags', () => {
    const document = createBackup(
      snapshot({
        dayRecords: [
          dayRecord({
            id: 'day-user',
            dataOrigin: 'user',
            notes: 'user note',
            synced: true,
          }),
          dayRecord({
            id: 'day-inferred',
            date: '2026-01-20',
            monitor: 'low',
            dataOrigin: 'inferred',
            inference: {
              rule: 'post-peak-low-tail',
              peakDay: 14,
              postPeakDays: 4,
              mode: 'auto-after-window',
            },
            synced: true,
          }),
        ],
        settings: settings({ synced: true, goal: 'achieve-pregnancy' }),
      }),
      { appVersion: '1.0.0', exportedAt: createdAt },
    )

    const prepared = prepareBackup(serializeBackup(document))
    const user = prepared.document.data.dayRecords.find((record) => record.id === 'day-user')
    const inferred = prepared.document.data.dayRecords.find((record) => record.id === 'day-inferred')

    expect(prepared.summary).toMatchObject({
      cycleCount: 1,
      dayRecordCount: 2,
      settingsIncluded: true,
    })
    expect(user).toMatchObject({
      id: 'day-user',
      notes: 'user note',
      dataOrigin: 'user',
      version: 3,
      createdAt,
      updatedAt,
      synced: false,
    })
    expect(inferred).toMatchObject({
      id: 'day-inferred',
      dataOrigin: 'inferred',
      inference: { rule: 'post-peak-low-tail', peakDay: 14 },
      synced: false,
    })
    expect(prepared.document.data.settings).toMatchObject({
      goal: 'achieve-pregnancy',
      synced: false,
    })
  })

  it('normalizes legacy records without provenance as user-authored', () => {
    const legacy = dayRecord()
    delete legacy.dataOrigin

    const prepared = prepareBackup(
      serializeBackup(
        createBackup(snapshot({ dayRecords: [legacy] }), {
          appVersion: '1.0.0',
          exportedAt: createdAt,
        }),
      ),
    )

    expect(prepared.document.data.dayRecords[0].dataOrigin).toBe('user')
  })

  it('accepts an empty dataset when settings are valid', () => {
    const prepared = prepareBackup(
      serializeBackup(
        createBackup(snapshot({ cycles: [], dayRecords: [] }), {
          appVersion: '1.0.0',
          exportedAt: createdAt,
        }),
      ),
    )

    expect(prepared.document.data.cycles).toEqual([])
    expect(prepared.document.data.dayRecords).toEqual([])
    expect(getBackupSummary(prepared.document).cycleCount).toBe(0)
  })
})

describe('backup migrations and strict validation', () => {
  it('migrates a supported older format before validating it', () => {
    const older = {
      format: BACKUP_FORMAT,
      formatVersion: 0,
      appVersion: '0.9.0',
      exportedAt: createdAt,
      data: {
        cycles: [cycle()],
        dayRecords: [{ ...dayRecord(), dataOrigin: undefined, inference: undefined }],
        settings: { ...settings(), postPeakFillMode: undefined, postPeakSuppressions: undefined },
      },
    }

    const prepared = prepareBackup(JSON.stringify(older))

    expect(prepared.document.formatVersion).toBe(CURRENT_BACKUP_VERSION)
    expect(prepared.document.data.settings.postPeakFillMode).toBe('auto-after-window')
    expect(prepared.document.data.settings.postPeakSuppressions).toEqual([])
    expect(prepared.document.data.dayRecords[0].dataOrigin).toBe('user')
  })

  it.each([
    ['a newer format', CURRENT_BACKUP_VERSION + 1, 'unsupported-format'],
    ['malformed JSON', '{not-json', 'invalid-json'],
    ['a wrong discriminator', BACKUP_FORMAT, 'invalid-format'],
  ] as const)('rejects %s', (_label, value, code) => {
    const text = typeof value === 'number'
      ? JSON.stringify({
          format: BACKUP_FORMAT,
          formatVersion: value,
          appVersion: '1.0.0',
          exportedAt: createdAt,
          data: { cycles: [], dayRecords: [], settings: settings() },
        })
      : value === '{not-json'
        ? value
        : JSON.stringify({
            format: 'not-marquette',
            formatVersion: CURRENT_BACKUP_VERSION,
            appVersion: '1.0.0',
            exportedAt: createdAt,
            data: { cycles: [], dayRecords: [], settings: settings() },
          })

    expect(() => prepareBackup(text)).toThrowError(expect.objectContaining({ code }))
  })

  it.each([
    ['duplicate cycle ids', snapshot({ cycles: [cycle(), cycle({ day1: '2026-02-01' })] }), 'duplicate-id'],
    ['duplicate day-record ids', snapshot({ dayRecords: [dayRecord(), dayRecord({ date: '2026-01-11' })] }), 'duplicate-id'],
    ['duplicate day-record dates', snapshot({ dayRecords: [dayRecord(), dayRecord({ id: 'day-2' })] }), 'duplicate-date'],
    ['invalid settings', snapshot({ settings: settings({ postPeakDays: 99 }) }), 'invalid-settings'],
    ['future day record', snapshot({ dayRecords: [dayRecord({ date: '2099-01-01' })] }), 'future-date'],
  ] as const)('rejects %s', (_label, input, code) => {
    const text = serializeBackup(createBackup(input, { appVersion: '1.0.0', exportedAt: createdAt }))
    expect(() => prepareBackup(text)).toThrowError(expect.objectContaining({ code }))
  })

  it('exposes a typed error for callers to map to UI copy', () => {
    try {
      prepareBackup('{not-json')
      expect.unreachable('expected prepareBackup to reject malformed JSON')
    } catch (error) {
      expect(error).toBeInstanceOf(BackupError)
      expect((error as BackupError).code).toBe('invalid-json')
    }
  })
})
