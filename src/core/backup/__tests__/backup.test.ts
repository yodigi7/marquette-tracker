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

  it('round-trips identity, content, and metadata while resetting sync flags', () => {
    const document = createBackup(
      snapshot({
        dayRecords: [
          dayRecord({ id: 'day-user', notes: 'user note', synced: true }),
          dayRecord({ id: 'day-two', date: '2026-01-20', monitor: 'low', synced: true }),
        ],
        settings: settings({ synced: true, goal: 'achieve-pregnancy' }),
      }),
      { appVersion: '1.0.0', exportedAt: createdAt },
    )

    const prepared = prepareBackup(serializeBackup(document))
    const user = prepared.document.data.dayRecords.find((record) => record.id === 'day-user')
    const second = prepared.document.data.dayRecords.find((record) => record.id === 'day-two')

    expect(prepared.summary).toMatchObject({
      cycleCount: 1,
      dayRecordCount: 2,
      settingsIncluded: true,
    })
    expect(user).toMatchObject({
      id: 'day-user',
      notes: 'user note',
      version: 3,
      createdAt,
      updatedAt,
      synced: false,
    })
    expect(second).toMatchObject({ id: 'day-two', monitor: 'low', synced: false })
    expect(prepared.document.data.settings).toMatchObject({
      goal: 'achieve-pregnancy',
      synced: false,
    })
  })

  it('exports no record origin and no fill preference', () => {
    const document = createBackup(snapshot(), { appVersion: '1.0.0', exportedAt: createdAt })
    const serialized = serializeBackup(document)

    expect(serialized).not.toContain('dataOrigin')
    expect(serialized).not.toContain('postPeakFillMode')
    expect(serialized).not.toContain('postPeakSuppressions')
    expect(document.data.dayRecords[0]).not.toHaveProperty('dataOrigin')
    expect(document.data.settings).not.toHaveProperty('postPeakFillMode')
  })

  it('accepts a document that still carries the legacy record origin', () => {
    const document = createBackup(snapshot(), { appVersion: '1.0.0', exportedAt: createdAt })
    const legacy = JSON.parse(serializeBackup(document)) as Record<string, never>
    ;(legacy.data as unknown as { dayRecords: Record<string, unknown>[] }).dayRecords[0].dataOrigin =
      'inferred'

    const prepared = prepareBackup(JSON.stringify(legacy))

    expect(prepared.document.data.dayRecords).toHaveLength(1)
  })

  it('defaults a legacy settings row without a calendar detail mode to simple', () => {
    const legacy = settings({ calendarDetailMode: 'full' })
    delete (legacy as Partial<SettingsEntity>).calendarDetailMode

    const prepared = prepareBackup(
      serializeBackup(
        createBackup(snapshot({ settings: legacy }), {
          appVersion: '1.0.0',
          exportedAt: createdAt,
        }),
      ),
    )

    expect(prepared.document.data.settings.calendarDetailMode).toBe('simple')
  })

  it('round-trips the cycle projection setting', () => {
    const document = createBackup(snapshot({ settings: settings({ projectFutureCycles: true }) }), {
      appVersion: '1.0.0',
      exportedAt: createdAt,
    })

    const prepared = prepareBackup(serializeBackup(document))

    expect(prepared.document.data.settings.projectFutureCycles).toBe(true)
  })

  it('defaults a legacy settings row without a cycle projection value to off', () => {
    const legacy = settings({ projectFutureCycles: true })
    delete (legacy as Partial<SettingsEntity>).projectFutureCycles

    const prepared = prepareBackup(
      serializeBackup(
        createBackup(snapshot({ settings: legacy }), {
          appVersion: '1.0.0',
          exportedAt: createdAt,
        }),
      ),
    )

    expect(prepared.document.data.settings.projectFutureCycles).toBe(false)
  })

  it('rejects a non-boolean cycle projection setting', () => {
    const document = createBackup(snapshot(), { appVersion: '1.0.0', exportedAt: createdAt })
    const raw = JSON.parse(serializeBackup(document)) as {
      data: { settings: Record<string, unknown> }
    }
    raw.data.settings.projectFutureCycles = 'yes'

    expect(() => prepareBackup(JSON.stringify(raw))).toThrow()
  })

  it('leaves the backup format version unchanged for the additive setting', () => {
    const document = createBackup(snapshot({ settings: settings({ projectFutureCycles: true }) }), {
      appVersion: '1.0.0',
      exportedAt: createdAt,
    })

    expect(document.formatVersion).toBe(CURRENT_BACKUP_VERSION)
    // additive field only: no other key appears or disappears
    expect(Object.keys(document.data.settings).sort()).toEqual(
      Object.keys(createBackup(snapshot(), { appVersion: '1.0.0', exportedAt: createdAt }).data.settings).sort(),
    )
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
        dayRecords: [{ ...dayRecord(), dataOrigin: 'inferred' }],
        settings: {
          ...settings(),
          postPeakFillMode: 'after-user-low',
          postPeakSuppressions: [{ date: '2026-01-21' }],
        },
      },
    }

    const prepared = prepareBackup(JSON.stringify(older))

    // Format version is unchanged: the change only removes fields.
    expect(prepared.document.formatVersion).toBe(CURRENT_BACKUP_VERSION)
    // Removed fields are no longer carried as meaningful state.
    expect(prepared.document.data.settings).not.toHaveProperty('postPeakFillMode')
    expect(prepared.document.data.settings).not.toHaveProperty('postPeakSuppressions')
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
