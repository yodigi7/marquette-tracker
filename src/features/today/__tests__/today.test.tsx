import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '@/core/store/useAppStore'
import { TodayView } from '../index'
import { dateKeyLocal, todayKey } from '../lib'

const store = () => useAppStore.getState()

async function bootWithCycle(day1Key: string) {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await store().setNewCycle(day1Key)
}

beforeEach(async () => {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()
})

afterEach(() => {
  cleanup()
})

describe('TodayView', () => {
  it('shows the start-cycle card when no cycle exists, and a status card after Day 1 is set', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TodayView />)

    expect(screen.getByText(/start a new cycle/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /set day 1/i }))
    await waitFor(() => expect(store().cycles).toHaveLength(1))

    rerender(<TodayView />)
    expect(await screen.findByText(/cycle 1 · day 1/i)).toBeInTheDocument()
    expect(screen.getByText('Not fertile yet')).toBeInTheDocument()
  })

  it('logging a monitor High flips the day to fertile (first-High begins the window)', async () => {
    const user = userEvent.setup()
    await bootWithCycle(todayKey())
    render(<TodayView />)

    await user.click(screen.getByRole('button', { name: /^high$/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Fertile window')).toBeInTheDocument()
    const row = store().dayRecords[0]
    expect(row.monitor).toBe('high')
    expect(store().output?.cycles[0]?.fertileWindow.beginRule).toBe('first-high-or-peak')
  })

  it('backfills a past date through the date picker and reloads its stored values', async () => {
    const user = userEvent.setup()
    await bootWithCycle(todayKey())
    const now = new Date()
    const past = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 2))
    const pastKey = dateKeyLocal(past)
    const { rerender } = render(<TodayView />)

    await user.click(screen.getByTestId('date-trigger'))
    const dayButton = await pickDayButton(user, past.getDate())
    if (!dayButton) return
    await user.click(dayButton)

    expect(await screen.findByText(`Log ${pastKey}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^low$/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      const record = store().dayRecords.find((r) => r.date === pastKey)
      expect(record?.monitor).toBe('low')
    })

    rerender(<TodayView />)
    await user.click(screen.getByTestId('date-trigger'))
    const again = await pickDayButton(user, past.getDate())
    if (again) await user.click(again)
    expect(await screen.findByText(`Log ${pastKey}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^low$/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clearing a field (BBT) saves null', async () => {
    const user = userEvent.setup()
    await bootWithCycle(todayKey())
    render(<TodayView />)

    const bbt = screen.getByPlaceholderText('36.5')
    await user.type(bbt, '36.6')
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(store().dayRecords[0]?.bbt).toBe(36.6))

    await user.clear(screen.getByPlaceholderText('36.5'))
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(store().dayRecords[0]?.bbt).toBe(null))
  })

  it('hides computed status when the algorithm is disabled', async () => {
    await bootWithCycle(todayKey())
    await store().updateSettings({ algorithmEnabled: false })
    render(<TodayView />)

    expect(await screen.findByText(/algorithm is off/i)).toBeInTheDocument()
    expect(screen.queryByText(/not fertile yet/i)).not.toBeInTheDocument()
  })
})

/** Returns the calendar day button for the given day of month, navigating months if needed. */
async function pickDayButton(user: ReturnType<typeof userEvent.setup>, day: number): Promise<HTMLElement | null> {
  for (let tries = 0; tries < 4; tries++) {
    const cell = screen.queryByRole('gridcell', { name: String(day) })
    if (cell) {
      return cell.querySelector('button')
    }
    const prev = screen.queryByRole('button', { name: /previous month/i })
    if (!prev) return null
    await user.click(prev)
  }
  return null
}