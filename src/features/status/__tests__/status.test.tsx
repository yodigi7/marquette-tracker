import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays } from '@/core/engine/dateUtils'
import { todayKey } from '@/core/dateKeys'
import { useAppStore } from '@/core/store/useAppStore'
import { StatusView } from '../index'

const store = () => useAppStore.getState()

async function bootWithCycle() {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await store().clearAllData()
  const cycle = await store().setNewCycle(todayKey())
  await store().addDayRecord(cycle.id, todayKey(), 1, { monitor: 'high' })
}

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await store().clearAllData()
})

afterEach(() => {
  cleanup()
})

describe('StatusView', () => {
  it('shows a date picker and derived status without daily-entry controls', async () => {
    await bootWithCycle()
    render(<StatusView />)

    expect(screen.getByTestId('date-trigger')).toBeInTheDocument()
    expect(screen.getByText(/cycle 1 · day 1/i)).toBeInTheDocument()
    expect(screen.getByText('Fertile window')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /set day 1/i })).toBeNull()
    expect(screen.queryByText(/medical device|marquette-certified instructor/i)).toBeNull()
  })

  it('marks calendar-derived status as predicted', async () => {
    const cycle = await store().setNewCycle(addDays(todayKey(), -5))
    await store().addDayRecord(cycle.id, addDays(todayKey(), -5), 1, { bloodFlow: 'medium' })

    render(<StatusView />)

    expect(screen.getByText('predicted')).toBeInTheDocument()
  })

  it('shows source, window explanation, and a next-period estimate when available', async () => {
    const previousStart = addDays(todayKey(), -60)
    const previous = await store().setNewCycle(previousStart)
    await store().addDayRecord(previous.id, previousStart, 1, { bloodFlow: 'medium' })
    const currentStart = addDays(todayKey(), -30)
    const current = await store().setNewCycle(currentStart)
    await store().addDayRecord(current.id, addDays(currentStart, 2), 3, { monitor: 'high' })

    render(<StatusView />)

    expect(screen.getByText('confirmed')).toBeInTheDocument()
    expect(screen.getByText(/Fertile from cycle day/i)).toBeInTheDocument()
    expect(screen.getByText(/estimated next period:/i)).toBeInTheDocument()
  })

  it('can inspect a selected date without showing a start-cycle form', async () => {
    const user = userEvent.setup()
    await bootWithCycle()
    render(<StatusView />)

    await user.click(screen.getByTestId('date-trigger'))
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dayButton = await pickDayButton(user, yesterday.getDate())
    if (dayButton) await user.click(dayButton)

    expect(await screen.findByText(/no cycle/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /set day 1/i })).toBeNull()
  })

  it('explains logging-only mode when the algorithm is disabled', async () => {
    await bootWithCycle()
    await store().updateSettings({ algorithmEnabled: false })
    render(<StatusView />)

    expect(screen.getByText(/algorithm is off/i)).toBeInTheDocument()
    expect(screen.queryByText('Fertile window')).toBeNull()
  })

  it('shows a no-cycle state on an empty store', () => {
    render(<StatusView />)

    expect(screen.getByText(/no cycle/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /set day 1/i })).toBeNull()
  })
})

async function pickDayButton(user: ReturnType<typeof userEvent.setup>, day: number): Promise<HTMLElement | null> {
  for (let tries = 0; tries < 4; tries++) {
    const cell = screen.queryByRole('gridcell', { name: String(day) })
    if (cell) {
      return cell.querySelector('button')
    }
    const previous = screen.queryByRole('button', { name: /previous month/i })
    if (!previous) return null
    await user.click(previous)
  }
  return null
}
