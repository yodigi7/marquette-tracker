import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { CycleChartView } from '../index'
import { installChartShim, seedCycles } from './helpers'

installChartShim()

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cycle" element={<CycleChartView />} />
        <Route path="/cycle/:cycleId" element={<CycleChartView />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function openOptions(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement[]> {
  await user.click(screen.getByTestId('cycle-selector'))
  return screen.getAllByRole('option')
}

describe('CycleChartView selector (US3)', () => {
  afterEach(() => cleanup())

  it('lists cycles newest-first with the label format and an (open) suffix', async () => {
    const { a } = await seedCycles()
    const user = userEvent.setup()
    renderAt(`/cycle/${a}`)

    expect(screen.getByTestId('cycle-selector')).toBeInTheDocument()
    expect(screen.getAllByTestId('day-band')).toHaveLength(28)

    const options = await openOptions(user)
    expect(options.map((o) => o.textContent).join(' | ')).toMatch(
      /Cycle 2 · starts Jan 29, 2026 · 6 days \(open\).*Cycle 1 · starts Jan 1, 2026 · 28 days/,
    )
  })

  it('selecting a cycle navigates to its strip', async () => {
    const { b } = await seedCycles()
    const user = userEvent.setup()
    renderAt(`/cycle/${b}`)
    expect(screen.getAllByTestId('day-band')).toHaveLength(6)

    const options = await openOptions(user)
    await user.click(options[1])
    expect(screen.getAllByTestId('day-band')).toHaveLength(28)
  })

  it('falls back to the newest cycle for unknown/absent ids (no cross-contamination)', async () => {
    await seedCycles()
    renderAt('/cycle/bogus')
    expect(screen.getAllByTestId('day-band')).toHaveLength(6)

    cleanup()
    await seedCycles()
    renderAt('/cycle')
    expect(screen.getAllByTestId('day-band')).toHaveLength(6)
  })
})