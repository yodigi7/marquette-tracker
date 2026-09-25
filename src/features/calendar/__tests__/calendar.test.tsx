import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays } from '@/core/engine/dateUtils'
import { dateKeyLocal, parseDateKey, todayKey } from '@/core/dateKeys'
import { useAppStore } from '@/core/store/useAppStore'
import { Toaster } from '@/components/ui/sonner'
import { CalendarView } from '../index'
import { autoOpenStorageKey } from '../auto-open'

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

function allowAutoOpen() {
  sessionStorage.removeItem(autoOpenStorageKey(todayKey()))
}

beforeEach(async () => {
  await bootCurrentMonth()
  sessionStorage.setItem(autoOpenStorageKey(todayKey()), 'consumed')
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

  it('auto-opens today when there is no record or Peak and the session has not consumed it', async () => {
    allowAutoOpen()
    const cycleStart = addDays(todayKey(), -5)
    const cycle = await store().setNewCycle(cycleStart)
    await store().addDayRecord(cycle.id, cycleStart, 1, { bloodFlow: 'medium' })

    render(<CalendarView />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Day details')).toBeInTheDocument()
    expect(sessionStorage.getItem(autoOpenStorageKey(todayKey()))).not.toBeNull()
  })

  it('does not auto-open when today already has a record', async () => {
    const cycle = await store().setNewCycle(todayKey())
    await store().addDayRecord(cycle.id, todayKey(), 1, { monitor: 'low' })
    allowAutoOpen()

    render(<CalendarView />)
    await screen.findAllByTestId('day-cell')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not auto-open when the current cycle has a monitor Peak', async () => {
    const cycleStart = addDays(todayKey(), -5)
    const cycle = await store().setNewCycle(cycleStart)
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { monitor: 'peak' })
    allowAutoOpen()

    render(<CalendarView />)
    await screen.findAllByTestId('day-cell')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not auto-open when the current cycle has a monitor Peak after a mucus Peak', async () => {
    const cycleStart = addDays(todayKey(), -6)
    const cycle = await store().setNewCycle(cycleStart)
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { monitor: 'peak' })
    await store().addDayRecord(cycle.id, addDays(cycleStart, 3), 4, { mucus: 'peak' })
    allowAutoOpen()

    render(<CalendarView />)
    await screen.findAllByTestId('day-cell')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('auto-opens when the current cycle has a mucus Peak but no monitor Peak', async () => {
    const cycleStart = addDays(todayKey(), -6)
    const cycle = await store().setNewCycle(cycleStart)
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { mucus: 'peak' })
    allowAutoOpen()

    render(<CalendarView />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('does not auto-open with consecutive monitor Peaks', async () => {
    const cycleStart = addDays(todayKey(), -6)
    const cycle = await store().setNewCycle(cycleStart)
    await store().addDayRecord(cycle.id, addDays(cycleStart, 2), 3, { monitor: 'peak' })
    await store().addDayRecord(cycle.id, addDays(cycleStart, 3), 4, { monitor: 'peak' })
    allowAutoOpen()

    render(<CalendarView />)
    await screen.findAllByTestId('day-cell')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not auto-open again after the date was consumed in this session', async () => {
    const cycleStart = addDays(todayKey(), -5)
    const cycle = await store().setNewCycle(cycleStart)
    await store().addDayRecord(cycle.id, cycleStart, 1, { bloodFlow: 'medium' })
    sessionStorage.setItem(autoOpenStorageKey(todayKey()), 'consumed')

    render(<CalendarView />)
    await screen.findAllByTestId('day-cell')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('auto-opens today when no cycle has been derived yet', async () => {
    allowAutoOpen()
    render(<CalendarView />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
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

  it('shows a small filled red heart for recorded intercourse', async () => {
    const now = new Date()
    const day1Key = dateKeyLocal(new Date(now.getFullYear(), now.getMonth(), 1))
    const intercourseKey = addDays(day1Key, 2)
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, intercourseKey, 3, { intercourse: true })

    render(<CalendarView />)

    const dayMarker = cellByDate(intercourseKey)?.querySelector('[title="Intercourse"]')
    expect(dayMarker?.querySelector('svg')).toHaveClass('size-2', 'fill-red-500', 'text-red-500')
    expect(screen.getByText('Intercourse').querySelector('svg')).toHaveClass('size-2', 'fill-red-500', 'text-red-500')
    expect(cellByDate(day1Key)?.querySelector('[title="Intercourse"]')).toBeNull()
  })

  it('opens a blank entry form for an uncovered past date and saves it', async () => {
    const user = userEvent.setup()
    render(<CalendarView />)

    const past = dateKeyLocal(new Date(nowYear(), nowMonth(), 1))
    await user.click(cellByDate(past)!)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/re-derives cycle structure/i)).toBeInTheDocument()
    expect(screen.queryByTestId('delete-record')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(store().dayRecords).toHaveLength(1))
    expect(store().cycles).toHaveLength(1)
    expect(store().dayRecords[0].date).toBe(past)
  })

  it('pre-populates a covered date that already has a record', async () => {
    const user = userEvent.setup()
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1))
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, day1Key, 1, { monitor: 'peak' })

    render(<CalendarView />)
    await user.click(cellByDate(day1Key)!)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('delete-record')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Peak' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens the day dialog without computed status, source, or forecast text', async () => {
    const user = userEvent.setup()
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1))
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, day1Key, 1, { monitor: 'peak' })
    await store().addDayRecord(id, addDays(day1Key, 13), 14, { monitor: 'high' })

    render(<CalendarView />)
    await user.click(cellByDate(addDays(day1Key, 13))!)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent('Status:')
    expect(dialog).not.toHaveTextContent('(confirmed)')
    expect(dialog).not.toHaveTextContent('(predicted)')
    expect(dialog).not.toHaveTextContent('post-peak')
  })

  it('keeps the day dialog free of derived status while the algorithm is off', async () => {
    const user = userEvent.setup()
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1))
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, day1Key, 1, { monitor: 'peak' })
    await store().updateSettings({ algorithmEnabled: false })

    render(<CalendarView />)
    await user.click(cellByDate(day1Key)!)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).not.toHaveTextContent('Status:')
    expect(dialog).not.toHaveTextContent('(confirmed)')
    expect(screen.getByTestId('delete-record')).toBeInTheDocument()
  })

  it('keeps existing values when a pre-populated form is saved', async () => {
    const user = userEvent.setup()
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1))
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, day1Key, 1, { monitor: 'high', bloodFlow: 'medium' })

    render(<CalendarView />)
    await user.click(cellByDate(day1Key)!)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('bloodflow')).toHaveTextContent('Medium')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(store().dayRecords).toHaveLength(1)
    expect(store().dayRecords[0].monitor).toBe('high')
    expect(store().dayRecords[0].bloodFlow).toBe('medium')
  })

  it('applies an edit made in a pre-populated form', async () => {
    const user = userEvent.setup()
    const day1Key = dateKeyLocal(new Date(nowYear(), nowMonth(), 1))
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, day1Key, 1, { monitor: 'high', bloodFlow: 'medium' })

    render(<CalendarView />)
    await user.click(cellByDate(day1Key)!)
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Peak' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(store().dayRecords[0].monitor).toBe('peak'))
    expect(store().dayRecords[0].bloodFlow).toBe('medium')
  })

  it('rejects a future date with a message and writes nothing', async () => {
    const user = userEvent.setup()
    stubMatchMedia()
    render(
      <>
        <CalendarView />
        <Toaster />
      </>,
    )

    await user.click(screen.getByRole('button', { name: /next month/i }))
    const future = firstDayOfNextMonth()
    await user.click(cellByDate(future)!)

    expect(await screen.findByText(/future dates cannot be logged/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store().dayRecords).toHaveLength(0)
  })

  it('opening and closing without saving creates nothing', async () => {
    const user = userEvent.setup()
    render(<CalendarView />)

    const past = dateKeyLocal(new Date(nowYear(), nowMonth(), 1))
    await user.click(cellByDate(past)!)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(store().dayRecords).toHaveLength(0)
    expect(store().cycles).toHaveLength(0)
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

function stubMatchMedia() {
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
}

function nowYear(): number {
  return new Date().getFullYear()
}

function nowMonth(): number {
  return new Date().getMonth()
}

function firstDayOfNextMonth(): string {
  const now = new Date()
  return dateKeyLocal(new Date(now.getFullYear(), now.getMonth() + 1, 1))
}

function monthTitleFor(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shiftedMonth(label: string, delta: number): string {
  const [month, year] = label.split(' ')
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const total = Number(year) * 12 + months.indexOf(month) + delta
  return `${months[((total % 12) + 12) % 12]} ${Math.floor(total / 12)}`
}