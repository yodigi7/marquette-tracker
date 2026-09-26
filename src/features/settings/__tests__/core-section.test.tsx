import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '@/core/store/useAppStore'
import { CoreSection } from '../core-section'

const store = () => useAppStore.getState()

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()
})

afterEach(() => {
  cleanup()
})

describe('CoreSection cycle projection control', () => {
  it('defaults to off', () => {
    render(<CoreSection />)
    expect(screen.getByTestId('settings-project-future-cycles')).toHaveAttribute('data-state', 'unchecked')
    expect(store().settings.projectFutureCycles).toBe(false)
  })

  it('names the calendar so the setting is not read as all predictions', () => {
    render(<CoreSection />)
    expect(screen.getByText('Project future cycles on the calendar')).toBeInTheDocument()
  })

  it('persists a change immediately', async () => {
    const user = userEvent.setup()
    render(<CoreSection />)

    await user.click(screen.getByTestId('settings-project-future-cycles'))

    await waitFor(() => expect(store().settings.projectFutureCycles).toBe(true))
    expect(screen.getByTestId('settings-project-future-cycles')).toHaveAttribute('data-state', 'checked')
  })

  it('survives a restart', async () => {
    const user = userEvent.setup()
    render(<CoreSection />)
    await user.click(screen.getByTestId('settings-project-future-cycles'))
    await waitFor(() => expect(store().settings.projectFutureCycles).toBe(true))

    useAppStore.setState({ hydrated: false })
    await useAppStore.getState().hydrate()
    expect(store().settings.projectFutureCycles).toBe(true)
  })
})
