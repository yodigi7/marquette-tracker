import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { createBackup, serializeBackup } from '@/core/backup'
import { fullSnapshot } from '@/core/backup/__tests__/fixtures'
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

function backupFile() {
  const text = serializeBackup(
    createBackup(fullSnapshot(), {
      appVersion: '1.0.0',
      exportedAt: '2026-02-03T04:05:06.000Z',
    }),
  )
  return new File([text], 'marquette-backup.json', { type: 'application/json' })
}

async function seedExistingData() {
  await store().setNewCycle('2026-03-01')
  await store().addDayRecord('', '2026-03-01', 1, { bloodFlow: 'medium' })
}

beforeEach(async () => {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:marquette-backup'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Settings JSON backup and restore', () => {
  it('places Data & backup between display/protocol and danger zone', () => {
    renderSettings()

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings).toEqual([
      'Core settings',
      'Display & protocol',
      'Data & backup',
      'Danger zone',
    ])
    expect(screen.getByTestId('data-backup-settings')).toBeInTheDocument()
    expect(screen.getByTestId('settings-backup-export')).toBeInTheDocument()
    expect(screen.getByTestId('settings-backup-import')).toBeInTheDocument()
  })

  it('exports a local JSON file without uploading data', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderSettings()

    await user.click(screen.getByTestId('settings-backup-export'))

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1))
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('validates a selected file and shows a summary without restoring', async () => {
    const user = userEvent.setup()
    await seedExistingData()
    renderSettings()

    await user.upload(screen.getByTestId('settings-backup-import'), backupFile())

    expect(await screen.findByTestId('settings-backup-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('settings-backup-summary')).toHaveTextContent('2 cycles')
    expect(screen.getByTestId('settings-backup-summary')).toHaveTextContent('4 day records')
    expect(store().cycles).toHaveLength(1)
    expect(screen.getByTestId('settings-backup-confirm')).toBeDisabled()
  })

  it('requires acknowledgement before replacing the complete dataset', async () => {
    const user = userEvent.setup()
    await seedExistingData()
    renderSettings()

    await user.upload(screen.getByTestId('settings-backup-import'), backupFile())
    await user.click(await screen.findByTestId('settings-backup-ack'))
    expect(screen.getByTestId('settings-backup-confirm')).toBeEnabled()
    await user.click(screen.getByTestId('settings-backup-confirm'))

    await waitFor(() => expect(store().cycles).toHaveLength(2))
    expect(store().settings.goal).toBe('achieve-pregnancy')
    expect(screen.queryByTestId('settings-backup-dialog')).not.toBeInTheDocument()
  })

  it('offers an optional current-data download before replacement', async () => {
    const user = userEvent.setup()
    await seedExistingData()
    renderSettings()

    await user.upload(screen.getByTestId('settings-backup-import'), backupFile())
    await user.click(await screen.findByTestId('settings-backup-download-current'))

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1))
    expect(store().cycles).toHaveLength(1)
  })

  it('leaves data intact when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    await seedExistingData()
    renderSettings()

    await user.upload(screen.getByTestId('settings-backup-import'), backupFile())
    await user.click(await screen.findByTestId('settings-backup-cancel'))

    expect(screen.queryByTestId('settings-backup-dialog')).not.toBeInTheDocument()
    expect(store().cycles).toHaveLength(1)
    expect(store().dayRecords).toHaveLength(1)
  })

  it('shows an unsupported-backup error and never opens confirmation', async () => {
    const user = userEvent.setup()
    const invalid = new File(['{"format":"marquette-tracker-backup","formatVersion":99}'], 'future.json', {
      type: 'application/json',
    })
    renderSettings()

    await user.upload(screen.getByTestId('settings-backup-import'), invalid)

    expect(await screen.findByTestId('settings-backup-error')).toHaveTextContent(/newer|unsupported/i)
    expect(screen.queryByTestId('settings-backup-dialog')).not.toBeInTheDocument()
  })
})
