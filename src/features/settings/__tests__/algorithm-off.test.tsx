import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { addDays } from '@/core/engine/dateUtils'
import { useAppStore } from '@/core/store/useAppStore'
import { todayKey } from '@/features/today/lib'
import { CalendarView } from '@/features/calendar'
import { TodayView } from '@/features/today'

const store = () => useAppStore.getState()

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()

  const cycle = await store().setNewCycle(todayKey())
  await store().addDayRecord(cycle.id, addDays(todayKey(), 5), 6, { monitor: 'high' })
  await store().addDayRecord(cycle.id, addDays(todayKey(), 6), 7, { monitor: 'peak' })
})

afterEach(() => {
  cleanup()
})

function statusCells() {
  return screen.getAllByTestId('day-cell')
}

describe('Algorithm off = logging only (US2)', () => {
  it('Calendar shows fertile-window shading when the algorithm is on', () => {
    render(<CalendarView />)

    const statuses = statusCells().map((cell) => cell.getAttribute('data-status')).filter(Boolean)
    expect(statuses.length).toBeGreaterThan(0)
  })

  it('Calendar drops all interpreted shading and predictions when the algorithm is off, keeping raw markers', async () => {
    await store().updateSettings({ algorithmEnabled: false })
    render(<CalendarView />)

    for (const cell of statusCells()) {
      expect(cell.getAttribute('data-status')).toBe('')
      expect(cell.getAttribute('data-forecast')).toBeNull()
      expect(cell.getAttribute('data-source')).toBe('')
    }

    const monitorDot = screen.getAllByTitle(/Monitor: high/i)
    expect(monitorDot.length).toBeGreaterThan(0)
  })

  it('Today shows the logging-only card when the algorithm is off', async () => {
    await store().updateSettings({ algorithmEnabled: false })
    render(<TodayView />)
    expect(screen.getByText(/algorithm is off/i)).toBeInTheDocument()
  })
})