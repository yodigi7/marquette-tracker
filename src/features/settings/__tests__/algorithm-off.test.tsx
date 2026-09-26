import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { addDays } from '@/core/engine/dateUtils'
import { useAppStore } from '@/core/store/useAppStore'
import { todayKey } from '@/core/dateKeys'
import { CalendarView } from '@/features/calendar'
import { StatusView } from '@/features/status'
import { SettingsView } from '@/features/settings'

const store = () => useAppStore.getState()

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()

  const cycle = await store().setNewCycle(addDays(todayKey(), -10))
  await store().addDayRecord(cycle.id, addDays(todayKey(), -5), 6, { monitor: 'high' })
  await store().addDayRecord(cycle.id, addDays(todayKey(), -4), 7, { monitor: 'peak' })
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
      expect(cell.getAttribute('data-phase')).toBeNull()
      expect(cell.getAttribute('data-forecast')).toBeNull()
      expect(cell.getAttribute('data-source')).toBeNull()
      expect(cell.className).not.toContain('bg-fertility-status-')
    }

    const monitorDot = screen.getAllByTitle(/Monitor: high/i)
    expect(monitorDot.length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('calendar-assumed-marker')).toHaveLength(0)
    expect(screen.queryByText('Fertile')).toBeNull()
    expect(screen.queryByText('Predicted window')).toBeNull()
    expect(screen.queryByText('Assumed')).toBeNull()
  })

  it('Settings no longer offers a post-Peak fill mode', async () => {
    await store().updateSettings({ algorithmEnabled: true })
    render(<SettingsView />)

    expect(screen.queryByTestId('settings-post-peak-fill-mode')).toBeNull()
    expect(screen.queryByText(/inferred post-Peak readings/i)).toBeNull()
  })

  it('restores interpretation when the algorithm is re-enabled', async () => {
    await store().updateSettings({ algorithmEnabled: false })
    const { rerender } = render(<StatusView />)
    expect(screen.getByText(/algorithm is off/i)).toBeInTheDocument()

    await store().updateSettings({ algorithmEnabled: true })
    rerender(<StatusView />)

    expect(screen.getByText('Fertile window')).toBeInTheDocument()
    expect(screen.getByText(/Fertile from cycle day/i)).toBeInTheDocument()
    expect(screen.getByText(/current Peak \+ 4 days/)).toBeInTheDocument()
  })

  it('Status shows the logging-only card when the algorithm is off', async () => {
    await store().updateSettings({ algorithmEnabled: false })
    render(<StatusView />)
    expect(screen.getByText(/algorithm is off/i)).toBeInTheDocument()
  })
})