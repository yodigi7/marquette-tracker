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
      dataOrigin: 'user',
      notes: 'User note',
      ...meta(5),
    },
    {
      id: 'inferred-low',
      cycleId: 'cycle-january',
      date: '2026-01-19',
      dayInCycle: 19,
      monitor: 'low',
      dataOrigin: 'inferred',
      inference: {
        rule: 'post-peak-low-tail',
        peakDay: 14,
        postPeakDays: 4,
        mode: 'auto-after-window',
      },
      ...meta(1),
    },
    {
      id: 'february-menses',
      cycleId: 'cycle-february',
      date: '2026-02-01',
      dayInCycle: 1,
      bloodFlow: 'medium',
      dataOrigin: 'user',
      ...meta(1),
    },
    {
      id: 'edited-inferred-low',
      cycleId: 'cycle-january',
      date: '2026-01-20',
      dayInCycle: 20,
      monitor: 'high',
      dataOrigin: 'user',
      inference: {
        rule: 'post-peak-low-tail',
        peakDay: 14,
        postPeakDays: 4,
        mode: 'auto-after-window',
      },
      notes: 'Edited after generation',
      ...meta(3),
    },
  ]

  const settings: SettingsEntity = {
    ...DEFAULT_SETTINGS,
    key: 'main',
    goal: 'achieve-pregnancy',
    postPeakFillMode: 'after-user-low',
    postPeakSuppressions: [
      {
        date: '2026-01-21',
        cycleId: 'cycle-january',
        cycleDay1: '2026-01-01',
        peakDay: 14,
        postPeakDays: 4,
        mode: 'after-user-low',
      },
    ],
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
