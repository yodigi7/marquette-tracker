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
    expect(band.getAttribute('data-source')).toBe('predicted')
  })

  it('shows day bands but no window band when the algorithm is disabled (FR-004)', async () => {
    const { a } = await seedCycles()
    await useAppStore.getState().updateSettings({ algorithmEnabled: false })
    renderAt(a)
    expect(screen.getAllByTestId('day-band')).toHaveLength(28)
    expect(screen.queryByTestId('fertile-window-band')).toBeNull()
    expect(document.querySelector('.recharts-reference-area')).toBeNull()
  })

  it('hides inferred Low rows while the algorithm is off but keeps user records', async () => {
    await resetStore()
    const start = addDays(todayKey(), -20)
    const cycle = await useAppStore.getState().setNewCycle(start)
    await useAppStore.getState().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
    await useAppStore.getState().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })

    const { rerender } = renderAt(cycle.id)
    const generatedBand = () => screen.getAllByTestId('day-band').find((band) => band.getAttribute('data-day') === '19')
    expect(generatedBand()?.getAttribute('data-monitor')).toBe('low')

    await useAppStore.getState().updateSettings({ algorithmEnabled: false })
    rerender(
      <MemoryRouter initialEntries={[`/cycle/${cycle.id}`]}>
        <Routes>
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(generatedBand()?.getAttribute('data-monitor')).not.toBe('low')
    expect(screen.getAllByTestId('day-band').find((band) => band.getAttribute('data-day') === '14')?.getAttribute('data-monitor')).toBe('peak')
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