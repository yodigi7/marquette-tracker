import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { seedDemoData } from '@/core/store/seedDemo'
import { useAppStore } from '@/core/store/useAppStore'
import { addDays } from '@/core/engine/dateUtils'
import { HistoryView } from '../index'

const store = () => useAppStore.getState()

async function boot() {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().clearAllData()
  await seedDemoData()
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
}

describe('HistoryView', () => {
  beforeEach(boot)
  afterEach(() => cleanup())

  it('renders stats, forecast, and a cycle table from seeded data', async () => {
    render(<HistoryView />)
    expect(await screen.findByText(/Forecast/i)).toBeInTheDocument()
    expect(screen.getByText(/Avg length/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Peak day/i).length).toBeGreaterThanOrEqual(1)
    // One table row per seeded cycle.
    expect(screen.getAllByRole('row')).toHaveLength(7) // header + 6 cycles
  })

  it('updates the open cycle live when a day record is added', async () => {
    render(<HistoryView />)
    expect(await screen.findByText(/Forecast/i)).toBeInTheDocument()

    const open = store().cycles.find((c) => c.closedAt === null)!
    expect(store().output!.cycles.find((c) => c.cycleId === open.id)!.peakDay).toBeNull()

    const openResult = store().output!.cycles.find((c) => c.cycleId === open.id)!
    const lastDay = openResult.days[openResult.days.length - 1]!.day
    const lastDate = addDays(open.day1, lastDay - 1)
    await store().addDayRecord(open.id, lastDate, lastDay, { monitor: 'peak' })

    // Engine output recomputes so the open cycle now has a Peak day.
    await waitFor(() => {
      expect(store().output!.cycles.find((c) => c.cycleId === open.id)!.peakDay).not.toBeNull()
    })

    // The open cycle's table row re-renders to show its new Peak day.
    const openRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('Open'))
    expect(openRow).toBeTruthy()
    expect(openRow!.textContent).toContain(`day ${lastDay}`)
  })
})