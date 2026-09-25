import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { useAppStore } from '@/core/store/useAppStore'
import { SettingsView } from '../index'

const store = () => useAppStore.getState()

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
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
  mockMatchMedia()
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
})

afterEach(() => {
  cleanup()
})

describe('Settings core preferences (US1)', () => {
  it('renders every core control reflecting the current settings', () => {
    renderSettings()

    expect(screen.getByTestId('settings-goal')).toHaveTextContent('Track only')
    expect(screen.getByTestId('settings-algorithm')).toBeChecked()
    expect(screen.getByTestId('settings-post-peak-days')).toHaveValue(4)
    expect(screen.getByTestId('settings-history-window')).toHaveValue(6)
    expect(screen.getByTestId('settings-theme')).toHaveTextContent('System')
  })

  it('persists the goal through the select', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByTestId('settings-goal'))
    await user.click(await screen.findByRole('option', { name: 'Avoid pregnancy' }))

    await waitFor(() => expect(store().settings.goal).toBe('avoid-pregnancy'))
  })

  it('persists the algorithm toggle', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByTestId('settings-algorithm'))

    await waitFor(() => expect(store().settings.algorithmEnabled).toBe(false))
  })

  it('persists valid post-peak and history-window edits', async () => {
    const user = userEvent.setup()
    renderSettings()

    const postPeak = screen.getByTestId('settings-post-peak-days')
    await user.clear(postPeak)
    await user.type(postPeak, '5')
    await user.tab()
    await waitFor(() => expect(store().settings.postPeakDays).toBe(5))

    const history = screen.getByTestId('settings-history-window')
    await user.clear(history)
    await user.type(history, '8')
    await user.tab()
    await waitFor(() => expect(store().settings.historyWindow).toBe(8))
  })

  it('rejects post-peak values outside integer 0-10 with inline error, not writing', async () => {
    const user = userEvent.setup()
    renderSettings()

    const postPeak = screen.getByTestId('settings-post-peak-days')
    await user.clear(postPeak)
    await user.type(postPeak, '-1')
    expect(await screen.findByText(/must be between 0 and 10/i)).toBeInTheDocument()
    expect(store().settings.postPeakDays).toBe(4)

    await user.clear(postPeak)
    await user.type(postPeak, '11')
    expect(screen.getByText(/must be between 0 and 10/i)).toBeInTheDocument()
    expect(store().settings.postPeakDays).toBe(4)
  })

  it('rejects history-window values outside integer 1-12 with inline error, not writing', async () => {
    const user = userEvent.setup()
    renderSettings()

    const history = screen.getByTestId('settings-history-window')
    await user.clear(history)
    await user.type(history, '0')
    expect(await screen.findByText(/must be between 1 and 12/i)).toBeInTheDocument()
    expect(store().settings.historyWindow).toBe(6)

    await user.clear(history)
    await user.type(history, '13')
    expect(screen.getAllByText(/must be between 1 and 12/i).length).toBeGreaterThan(0)
    expect(store().settings.historyWindow).toBe(6)
  })

  it('applies the dark theme class and persists the theme choice', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByTestId('settings-theme'))
    await user.click(await screen.findByRole('option', { name: 'Dark' }))

    await waitFor(() => expect(store().settings.theme).toBe('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})