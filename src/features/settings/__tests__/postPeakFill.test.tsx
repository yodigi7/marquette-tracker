import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays } from '@/core/engine/dateUtils'
import { todayKey } from '@/core/dateKeys'
import { useAppStore } from '@/core/store/useAppStore'
import { ThemeProvider } from 'next-themes'
import { SettingsView } from '../index'

const store = () => useAppStore.getState()

function stubMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function renderSettings() {
  stubMatchMedia()
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      <SettingsView />
    </ThemeProvider>,
  )
}

async function seedPeak() {
  const start = addDays(todayKey(), -20)
  const cycle = await store().setNewCycle(start)
  await store().addDayRecord(cycle.id, start, 1, { bloodFlow: 'medium' })
  await store().addDayRecord(cycle.id, addDays(start, 13), 14, { monitor: 'peak' })
  return { start, cycle }
}

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()
})

afterEach(() => {
  cleanup()
})

describe('post-Peak fill settings', () => {
  it('defaults to automatic-after-window and persists the selected mode', async () => {
    const user = userEvent.setup()
    renderSettings()

    expect(screen.getByTestId('settings-post-peak-fill-mode')).toHaveTextContent('Automatically after fertile window')
    await user.click(screen.getByTestId('settings-post-peak-fill-mode'))
    await user.click(await screen.findByRole('option', { name: 'After first user Low' }))

    await waitFor(() => expect(store().settings.postPeakFillMode).toBe('after-user-low'))
  })

  it('preserves generated rows when interpretation is turned off', async () => {
    const user = userEvent.setup()
    await seedPeak()
    const before = store().dayRecords.filter((record) => record.dataOrigin === 'inferred').map((record) => record.id)
    renderSettings()

    await user.click(screen.getByTestId('settings-algorithm'))
    await waitFor(() => expect(store().settings.algorithmEnabled).toBe(false))
    expect(store().dayRecords.filter((record) => record.dataOrigin === 'inferred').map((record) => record.id)).toEqual(before)
  })

  it('recomputes the tail when post-Peak days change', async () => {
    const user = userEvent.setup()
    const { start } = await seedPeak()
    const before = store().dayRecords.find((record) => record.dataOrigin === 'inferred')?.date
    renderSettings()

    const field = screen.getByTestId('settings-post-peak-days')
    await user.clear(field)
    await user.type(field, '5')
    await user.tab()

    await waitFor(() => {
      const rows = store().dayRecords.filter((record) => record.dataOrigin === 'inferred')
      expect(rows[0]?.date).not.toBe(before)
      expect(rows.every((row) => row.date >= addDays(start, 19))).toBe(true)
    })
  })
})
