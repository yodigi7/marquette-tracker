import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
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

  it('shows the empty state with a start-a-cycle action when no cycles exist', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await resetStore()
      renderAt('missing')
      expect(screen.getByTestId('cycle-chart-empty')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /start a cycle/i })).toBeInTheDocument()
      expect(screen.queryByTestId('day-band')).toBeNull()
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })
})