import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { addDays } from '@/core/engine/dateUtils'
import { useAppStore } from '@/core/store/useAppStore'
import { todayKey } from '@/features/today/lib'
import { SettingsView } from '../index'

const store = () => useAppStore.getState()

function renderSettings() {
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
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      <SettingsView />
    </ThemeProvider>,
  )
}

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()

  const first = await store().setNewCycle(todayKey())
  await store().addDayRecord(first.id, addDays(todayKey(), 5), 6, { monitor: 'high' })
  await store().setNewCycle(addDays(todayKey(), 25))
})

afterEach(() => {
  cleanup()
})

describe('Clear all data (US3)', () => {
  it('executes only after acknowledging, then wipes everything and restores defaults', async () => {
    const user = userEvent.setup()
    renderSettings()
    expect(store().cycles).toHaveLength(2)

    await user.click(screen.getByTestId('settings-clear-data'))
    const execute = screen.getByTestId('settings-clear-execute')
    expect(execute).toBeDisabled()

    await user.click(screen.getByTestId('settings-clear-ack'))
    expect(execute).toBeEnabled()

    await user.click(execute)

    await waitFor(() => expect(store().cycles).toHaveLength(0))
    expect(store().dayRecords).toHaveLength(0)
    expect(store().settings.algorithmEnabled).toBe(true)
    expect(store().settings.goal).toBe('track-only')
    expect(store().settings.postPeakDays).toBe(3)
    expect(store().settings.weekStart).toBe('monday')
    expect(store().settings.cycleMinLength).toBe(21)

    await waitFor(() => expect(screen.queryByTestId('settings-clear-dialog')).not.toBeInTheDocument())
  })

  it('leaves data intact when the dialog is dismissed', async () => {
    const user = userEvent.setup()
    renderSettings()
    expect(store().cycles).toHaveLength(2)

    await user.click(screen.getByTestId('settings-clear-data'))
    expect(screen.getByTestId('settings-clear-dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByTestId('settings-clear-dialog')).not.toBeInTheDocument()
    expect(store().cycles).toHaveLength(2)
    expect(store().dayRecords).toHaveLength(1)
  })
})