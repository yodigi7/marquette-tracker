import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { todayKey } from '@/core/dateKeys'
import { useAppStore } from '@/core/store/useAppStore'
import { AppRouter } from '../router'

const store = () => useAppStore.getState()

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await store().clearAllData()
  sessionStorage.setItem(`marquette-calendar-auto-open:${todayKey()}`, 'consumed')
})

afterEach(() => {
  cleanup()
})

describe('AppRouter', () => {
  it('renders Calendar at the root route', () => {
    renderAt('/')

    expect(screen.getAllByTestId('day-cell').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument()
  })

  it('renders Status at /status', () => {
    renderAt('/status')

    expect(screen.getByRole('link', { name: 'Status' })).toHaveAttribute('href', '/status')
    expect(screen.getByTestId('date-trigger')).toBeInTheDocument()
  })

  it('does not expose /calendar as a route', () => {
    renderAt('/calendar')

    expect(screen.queryByTestId('day-cell')).toBeNull()
    expect(screen.queryByTestId('date-trigger')).toBeNull()
  })
})
