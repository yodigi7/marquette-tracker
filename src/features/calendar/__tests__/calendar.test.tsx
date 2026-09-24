import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays } from '@/core/engine/dateUtils'
import { dateKeyLocal, parseDateKey, todayKey } from '@/core/dateKeys'
import { useAppStore } from '@/core/store/useAppStore'
import { CalendarView } from '../index'

const store = () => useAppStore.getState()

function cellByDate(dateKey: string): HTMLElement | null {
  const cell = screen
    .getAllByTestId('day-cell')
    .find((el) => el.getAttribute('data-date') === dateKey)
  return cell ?? null
}

async function bootCurrentMonth() {
  useAppStore.setState({ hydrated: false })
  await useAppStore.getState().hydrate()
  await useAppStore.getState().clearAllData()
}

beforeEach(async () => {
  await bootCurrentMonth()
})

afterEach(() => {
  cleanup()
})

describe('CalendarView', () => {
  it('navigates months and resets to the current month', async () => {
    const user = userEvent.setup()
    render(<CalendarView />)

    const current = monthTitleFor(parseDateKey(todayKey()))
    await user.click(screen.getByRole('button', { name: /next month/i }))
    expect(await screen.findByText(shiftedMonth(current, 1))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /today/i }))
    expect(await screen.findByText(current)).toBeInTheDocument()
  })

  it('shows status bands, menses and monitor dots for a seeded cycle', async () => {
    const now = new Date()
    const day1Key = dateKeyLocal(new Date(now.getFullYear(), now.getMonth(), 1))
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, day1Key, 1, { bloodFlow: 'medium' })
    const day3Key = addDays(day1Key, 2)
    await store().addDayRecord(id, day3Key, 3, { monitor: 'high' })

    render(<CalendarView />)

    const day1 = cellByDate(day1Key)
    expect(day1?.getAttribute('data-status')).toBe('pre-fertile')
    expect(day1?.getAttribute('data-source')).toBe('predicted')
    expect(day1?.querySelector('[title="Menses"]')).not.toBeNull()

    const day3 = cellByDate(day3Key)
    expect(day3?.getAttribute('data-status')).toBe('fertile')
    expect(day3?.getAttribute('data-source')).toBe('confirmed')
    expect(day3?.querySelector('[title="Monitor: high"]')).not.toBeNull()
  })

  it('marks calendar-range and first-High-range cells with distinct sources', async () => {
    const now = new Date()
    const day1Key = dateKeyLocal(new Date(now.getFullYear(), now.getMonth(), 1))
    const highKey = addDays(day1Key, 3)
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, addDays(day1Key, 2), 3, {})
    await store().addDayRecord(id, highKey, 4, { monitor: 'high' })

    render(<CalendarView />)

    const beforeHigh = cellByDate(addDays(day1Key, 2))
    expect(beforeHigh?.getAttribute('data-status')).toBe('pre-fertile')
    expect(beforeHigh?.getAttribute('data-source')).toBe('predicted')

    const firstHighDay = cellByDate(highKey)
    expect(firstHighDay?.getAttribute('data-status')).toBe('fertile')
    expect(firstHighDay?.getAttribute('data-source')).toBe('confirmed')
  })
})

function monthTitleFor(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shiftedMonth(label: string, delta: number): string {
  const [month, year] = label.split(' ')
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const total = Number(year) * 12 + months.indexOf(month) + delta
  return `${months[((total % 12) + 12) % 12]} ${Math.floor(total / 12)}`
}