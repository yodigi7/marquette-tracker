import { describe, expect, it } from 'vitest'
import { createBackup, prepareBackup, serializeBackup } from '../index'
import { emptySnapshot, fullSnapshot } from './fixtures'

describe('backup round-trip fixtures', () => {
  it('round-trips user records and cycle metadata', () => {
    const document = createBackup(fullSnapshot(), {
      appVersion: '1.0.0',
      exportedAt: '2026-02-03T04:05:06.000Z',
    })
    const prepared = prepareBackup(serializeBackup(document))

    expect(prepared.document.data.cycles.map((cycle) => cycle.id)).toEqual([
      'cycle-january',
      'cycle-february',
    ])
    expect(prepared.document.data.cycles[0]).toMatchObject({
      notes: 'January notes',
      pinned: true,
      synced: false,
    })
    expect(prepared.document.data.dayRecords.find((record) => record.id === 'user-peak')).toMatchObject({
      monitor: 'peak',
      mucus: 'low',
      notes: 'User note',
      synced: false,
    })
    expect(prepared.document.data.dayRecords.find((record) => record.id === 'user-low')).toMatchObject({
      monitor: 'low',
      synced: false,
    })
    expect(prepared.document.data.dayRecords.find((record) => record.id === 'user-high')).toMatchObject({
      monitor: 'high',
      notes: 'Entered by hand',
      synced: false,
    })
    expect(prepared.document.data.settings.synced).toBe(false)
  })

  it('round-trips an empty dataset without inventing records', () => {
    const prepared = prepareBackup(
      serializeBackup(
        createBackup(emptySnapshot(), {
          appVersion: '1.0.0',
          exportedAt: '2026-02-03T04:05:06.000Z',
        }),
      ),
    )

    expect(prepared.document.data.cycles).toEqual([])
    expect(prepared.document.data.dayRecords).toEqual([])
    expect(prepared.document.data.settings.key).toBe('main')
  })
})
