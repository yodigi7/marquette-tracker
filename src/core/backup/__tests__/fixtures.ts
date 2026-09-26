import type { CycleEntity, DayRecordEntity, SettingsEntity } from '@/core/store/entities'
import { DEFAULT_SETTINGS } from '@/core/store/entities'
import type { BackupSnapshot } from '../types'

const stamp = '2026-01-01T00:00:00.000Z'

function meta(version: number, synced = true) {
  return { version, synced, createdAt: stamp, updatedAt: stamp }
}

export function fullSnapshot(): BackupSnapshot {
  const cycles: CycleEntity[] = [
    {
      id: 'cycle-january',
      day1: '2026-01-01',
      cycleNo: 1,
      closedAt: '2026-01-31',
      notes: 'January notes',
      pinned: true,
      ...meta(4),
    },
    {
      id: 'cycle-february',
      day1: '2026-02-01',
      cycleNo: 2,
      closedAt: null,
      notes: '',
      pinned: false,
      ...meta(2),
    },
  ]

  const dayRecords: DayRecordEntity[] = [
    {
      id: 'user-peak',
      cycleId: 'cycle-january',
      date: '2026-01-14',
      dayInCycle: 14,
      monitor: 'peak',
      mucus: 'low',
      bloodFlow: 'medium',
      notes: 'User note',
      ...meta(5),
    },
    {
      id: 'user-low',
      cycleId: 'cycle-january',
      date: '2026-01-19',
      dayInCycle: 19,
      monitor: 'low',
      ...meta(1),
    },
    {
      id: 'february-menses',
      cycleId: 'cycle-february',
      date: '2026-02-01',
      dayInCycle: 1,
      bloodFlow: 'medium',
      ...meta(1),
    },
    {
      id: 'user-high',
      cycleId: 'cycle-january',
      date: '2026-01-20',
      dayInCycle: 20,
      monitor: 'high',
      notes: 'Entered by hand',
      ...meta(3),
    },
  ]

  const settings: SettingsEntity = {
    ...DEFAULT_SETTINGS,
    key: 'main',
    goal: 'achieve-pregnancy',
    ...meta(6),
  }

  return { cycles, dayRecords, settings }
}

export function emptySnapshot(): BackupSnapshot {
  return {
    cycles: [],
    dayRecords: [],
    settings: { ...DEFAULT_SETTINGS, key: 'main', ...meta(1, false) },
  }
}
