import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Providers } from '../providers'
import { useAppStore } from '@/core/store/useAppStore'

beforeEach(() => {
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
  useAppStore.setState({
    hydrated: false,
    settings: { ...useAppStore.getState().settings, demoSeeded: true },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Providers hydration gate', () => {
  it('keeps app content hidden until the hydration promise resolves', async () => {
    let releaseHydration!: () => void
    const hydrationGate = new Promise<void>((resolve) => {
      releaseHydration = resolve
    })
    vi.spyOn(useAppStore.getState(), 'hydrate').mockImplementation(async () => {
      await hydrationGate
      useAppStore.setState({ hydrated: true })
    })

    render(
      <Providers>
        <div data-testid="app-content">App content</div>
      </Providers>,
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument()

    releaseHydration()
    await waitFor(() => expect(screen.getByTestId('app-content')).toBeInTheDocument())
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('keeps the loading gate active when hydration rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(useAppStore.getState(), 'hydrate').mockRejectedValue(new Error('reconciliation failed'))

    render(
      <Providers>
        <div data-testid="app-content">App content</div>
      </Providers>,
    )

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('App hydration failed', expect.any(Error)))
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument()
  })
})
