import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { addDays } from '@/core/engine/dateUtils'
import { todayKey } from '@/core/dateKeys'
import { useAppStore } from '@/core/store/useAppStore'
import { CycleChartView } from '../index'
import { installChartShim, resetStore, seedCycles } from './helpers'

installChartShim()

function renderAt(cycleId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cycle/${cycleId}`]}>
      <Routes>
        <Route path="/cycle/:cycleId" element={<CycleChartView />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CycleChartView', () => {
  afterEach(() => cleanup())

  it('renders a day-band strip and fertile window for a closed cycle (US1)', async () => {
    const { a } = await seedCycles()
    renderAt(a)
    expect(screen.getAllByTestId('day-band')).toHaveLength(28)
    const band = screen.getByTestId('fertile-window-band')
    expect(band.getAttribute('data-begin')).not.toBeNull()
    expect(band.getAttribute('data-source')).toBeNull()
    expect(document.querySelector('.recharts-reference-area-rect')?.getAttribute('fill')).toBe('var(--fertility-window-fill)')
    expect(document.querySelector('[data-legend-label="Low"] span')?.getAttribute('class')).toContain('bg-fertility-monitor-low')
  })

  it('shows day bands but no window band when the algorithm is disabled (FR-004)', async () => {
    const { a } = await seedCycles()
    await useAppStore.getState().updateSettings({ algorithmEnabled: false })
    renderAt(a)
    expect(screen.getAllByTestId('day-band')).toHaveLength(28)
    expect(screen.queryByTestId('fertile-window-band')).toBeNull()
    expect(document.querySelector('.recharts-reference-area')).toBeNull()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.queryByText('Predicted window')).toBeNull()
    expect(screen.queryByText('Confirmed window')).toBeNull()
  })

  it('keeps user records and drops only the window band while the algorithm is off', async () => {
    await resetStore()
    const start = addDays(todayKey(), -20)
    const cycle = await useAppStore.getState().setNewCycle(start)
    await useAppStore.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
    await useAppStore.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })

    const { rerender } = renderAt(cycle.id)
    // Only the two logged days carry a monitor reading; nothing is synthesized.
    const bands = () => screen.getAllByTestId('day-band')
    expect(bands().find((band) => band.getAttribute('data-day') === '14')?.getAttribute('data-monitor')).toBe('peak')
    expect(bands().find((band) => band.getAttribute('data-day') === '19')?.getAttribute('data-monitor')).toBeUndefined()

    await useAppStore.getState().updateSettings({ algorithmEnabled: false })
    rerender(
      <MemoryRouter initialEntries={[`/cycle/${cycle.id}`]}>
        <Routes>
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('fertile-window-band')).toBeNull()
    // Stored readings remain visible with interpretation off.
    expect(bands().find((band) => band.getAttribute('data-day') === '14')?.getAttribute('data-monitor')).toBe('peak')
  })

  it('shows the empty state with a Calendar action when no cycles exist', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await resetStore()
      renderAt('missing')
      expect(screen.getByTestId('cycle-chart-empty')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute('href', '/')
      expect(screen.queryByTestId('day-band')).toBeNull()
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })
})