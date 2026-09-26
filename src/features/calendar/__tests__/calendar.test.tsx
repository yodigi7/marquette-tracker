import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays } from '@/core/engine/dateUtils'
import { dateKeyLocal, parseDateKey, todayKey } from '@/core/dateKeys'
import { useAppStore } from '@/core/store/useAppStore'
import { Toaster } from '@/components/ui/sonner'
import { CalendarView } from '../index'
import { DayCell } from '../day-cell'
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

  it('shows the current cycle, day, phase, and monitor reading in the summary', async () => {
    const today = todayKey()
    const cycleStart = addDays(today, -5)
    const cycle = await store().setNewCycle(cycleStart)
    await store().addDayRecord(cycle.id, today, 6, { monitor: 'high' })

    render(<CalendarView />)

    const summary = await screen.findByTestId('calendar-summary')
    expect(summary).toHaveTextContent('Cycle 1')
    expect(summary).toHaveTextContent('Day 6')
    expect(summary).toHaveTextContent('Fertile')
    expect(summary).toHaveTextContent('High')
  })

  it('keeps the summary visible with a no-reading state when today has no monitor value', async () => {
    await store().setNewCycle(todayKey())

    render(<CalendarView />)

    const summary = await screen.findByTestId('calendar-summary')
    expect(summary).toHaveTextContent('Cycle 1')
    expect(summary).toHaveTextContent('No monitor logged')
  })

  it('shows a logging-only summary when interpretation is disabled', async () => {
    const today = todayKey()
    const cycle = await store().setNewCycle(addDays(today, -5))
    await store().addDayRecord(cycle.id, today, 6, { monitor: 'high' })
    await store().updateSettings({ algorithmEnabled: false })

    render(<CalendarView />)

    const summary = await screen.findByTestId('calendar-summary')
    expect(summary).toHaveTextContent('Logging only')
    expect(summary).not.toHaveTextContent('Fertile')
  })

  it('shows a no-cycle summary before any cycle is derived', async () => {
    render(<CalendarView />)

    const summary = await screen.findByTestId('calendar-summary')
    expect(summary).toHaveTextContent('No cycle yet')
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
    expect(day1?.getAttribute('data-source')).toBeNull()
    expect(day1?.querySelector('[title="Menses"]')).not.toBeNull()

    const day3 = cellByDate(day3Key)
    expect(day3?.getAttribute('data-status')).toBe('fertile')
    expect(day3?.getAttribute('data-source')).toBeNull()
    expect(day3?.querySelector('[title="Monitor: high"]')).not.toBeNull()

    // An unlogged day inside the window is painted from the rules alone.
    const day2 = cellByDate(addDays(day1Key, 1))
    expect(day2?.getAttribute('data-status')).toBe('pre-fertile')
    expect(day2?.querySelector('[title="Monitor: high"]')).toBeNull()
  })

  it('shows a small filled red heart for recorded intercourse', async () => {
    const now = new Date()
    const day1Key = dateKeyLocal(new Date(now.getFullYear(), now.getMonth(), 1))
    const intercourseKey = addDays(day1Key, 2)
    const { id } = await store().setNewCycle(day1Key)
    await store().addDayRecord(id, intercourseKey, 3, { intercourse: true })
    await store().updateSettings({ calendarDetailMode: 'full' })

    render(<CalendarView />)

    const dayMarker = cellByDate(intercourseKey)?.querySelector('[title="Intercourse"]')
    expect(dayMarker?.querySelector('svg')).toHaveClass('size-2', 'fill-fertility-marker-intercourse', 'text-fertility-marker-intercourse')
    expect(screen.getByText('Intercourse').querySelector('svg')).toHaveClass('size-2', 'fill-fertility-marker-intercourse', 'text-fertility-marker-intercourse')
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

    const firstHighDay = cellByDate(highKey)
    expect(firstHighDay?.getAttribute('data-status')).toBe('fertile')
  })

  it('uses shared tokenized treatments for all four statuses', () => {
    // The Calendar collapses post-peak and post-calendar into the `after`
    // phase, which deliberately reuses the post-peak treatment.
    const cases = [
      { status: 'pre-fertile' as const, fill: 'bg-fertility-status-pre' },
      { status: 'fertile' as const, fill: 'bg-fertility-status-fertile' },
      { status: 'post-peak' as const, fill: 'bg-fertility-status-post-peak' },
      { status: 'post-calendar' as const, fill: 'bg-fertility-status-post-peak' },
    ]

    for (const testCase of cases) {
      const { unmount } = render(
        <DayCell
          dateKey="2026-01-01"
          dayNumber={1}
          info={testCase.status}
          forecast={false}
          menses={false}
          monitor={undefined}
          intercourse={false}
            isToday={false}
          detailMode="full"
          onSelect={() => {}}
        />,
      )
      const cell = screen.getByTestId('day-cell')
      expect(cell.className).toContain(testCase.fill)
      expect(cell.getAttribute('data-status')).toBe(testCase.status)
      // No evidence-source cue is rendered.
      expect(cell.getAttribute('data-source')).toBeNull()
      unmount()
    }
  })

  it('renders a simple phase cell with a menses stripe and one monitor marker', () => {
    render(
      <DayCell
        dateKey="2026-01-14"
        dayNumber={14}
        info={'post-calendar'}
        forecast={false}
        menses
        monitor="high"
        intercourse
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    )

    const cell = screen.getByTestId('day-cell')
    expect(cell).toHaveAttribute('data-phase', 'after')
    expect(cell.className).toContain('bg-fertility-status-post-peak')
    expect(cell.querySelector('[data-testid="calendar-menses-stripe"]')).not.toBeNull()
    expect(cell.querySelector('[data-testid="calendar-monitor-marker"]')?.className).toContain('bg-fertility-monitor-high')
    // No assumed-data asterisk is rendered anywhere.
    expect(cell.querySelector('[data-testid="calendar-assumed-marker"]')).toBeNull()
    expect(cell.textContent).not.toContain('*')
    expect(cell.querySelector('[title="Intercourse"]')).toBeNull()
    expect(cell.querySelector('[title="Predicted ovulation"]')).toBeNull()
  })

  it('names the date, phase, monitor value, and menses in the cell accessible label', () => {
    render(
      <DayCell
        dateKey="2026-01-14"
        dayNumber={14}
        info={'post-calendar'}
        forecast={false}
        menses
        monitor="high"
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    )

    const label = screen.getByTestId('day-cell').getAttribute('aria-label') ?? ''
    expect(label).toContain('2026-01-14')
    expect(label).toContain('After')
    expect(label).toContain('monitor high')
    expect(label).toContain('menses')
    expect(label).not.toContain('assumed')
  })

  it('exposes secondary indicators in the full-detail cell presentation', () => {
    render(
      <DayCell
        dateKey="2026-01-15"
        dayNumber={15}
        info={'fertile'}
        forecast={false}
        menses={false}
        monitor="peak"
        intercourse
        isToday={false}
        detailMode="full"
        onSelect={() => {}}
      />,
    )

    const cell = screen.getByTestId('day-cell')
    expect(cell.className).toContain('bg-fertility-status-fertile')
    expect(cell.querySelector('[title="Intercourse"] svg')).not.toBeNull()
    // no single-day ovulation estimate is rendered in any presentation
    expect(cell.querySelector('[title="Predicted ovulation"]')).toBeNull()
  })

  it('keeps the phase fill on a projected cell so the window status still reads', () => {
    render(
      <DayCell
        dateKey="2026-01-09"
        dayNumber={9}
        info={'fertile'}
        forecast
        menses={false}
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    )

    const cell = screen.getByTestId('day-cell')
    // the phase survives; the dashed border is what says "not yet"
    expect(cell.className).toContain('bg-fertility-status-fertile')
    expect(cell.className).toContain('border-dashed border-fertility-forecast-border')
    expect(cell).toHaveAttribute('data-forecast', 'true')
    expect(cell.getAttribute('aria-label')).toContain('projected')
  })
  it('renders predictive forecast cells and additive raw markers with tokenized cues', () => {
    render(
      <DayCell
        dateKey="2026-01-02"
        dayNumber={2}
        info={null}
        forecast
        menses
        monitor="low"
        intercourse
        isToday={false}
        detailMode="full"
        onSelect={() => {}}
      />,
    )

    const cell = screen.getByTestId('day-cell')
    expect(cell.className).toContain('bg-fertility-forecast-bg')
    expect(cell.className).toContain('border-dashed border-fertility-forecast-border')
    expect(cell.querySelector('[title="Monitor: low"]')?.className).toContain('bg-fertility-monitor-low')
    expect(cell.querySelector('[title="Menses"]')?.className).toContain('bg-fertility-marker-menses')
    expect(cell.querySelector('[title="Intercourse"] svg')?.getAttribute('class')).toContain('fill-fertility-marker-intercourse')
    expect(cell.querySelector('[data-testid="calendar-assumed-marker"]')).toBeNull()
    expect(cell.querySelector('[title="Predicted ovulation"]')).toBeNull()
  })

  it('gives projected days and window-forecast days the same predictive cue', () => {
    const projected = render(
      <DayCell
        dateKey="2026-01-09"
        dayNumber={9}
        info={'fertile'}
        forecast
        menses={false}
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    )
    const projectedCell = screen.getByTestId('day-cell')
    const projectedClasses = projectedCell.className
    expect(projectedClasses).toContain('border-fertility-forecast-border')
    // the phase survives, which is what distinguishes a projected day
    expect(projectedClasses).toContain('bg-fertility-status-fertile')
    projected.unmount()

    render(
      <DayCell
        dateKey="2026-01-10"
        dayNumber={10}
        info={null}
        forecast
        menses={false}
        monitor={undefined}
        intercourse={false}
        isToday={false}
        detailMode="simple"
        onSelect={() => {}}
      />,
    )
    const forecastCell = screen.getByTestId('day-cell')
    // a forecast day with no status yet falls back to the forecast fill, but
    // the predictive border is the same cue in both cases
    expect(forecastCell.className).toContain('border-fertility-forecast-border')
    expect(forecastCell.className).toContain('bg-fertility-forecast-bg')
  })

  it('keeps raw markers but removes interpretation styling when the algorithm is off', async () => {
    const cycle = await store().setNewCycle(addDays(todayKey(), -5))
    await store().addDayRecord(cycle.id, addDays(todayKey(), -5), 1, { bloodFlow: 'medium' })
    await store().addDayRecord(cycle.id, addDays(todayKey(), -4), 2, { monitor: 'high' })
    await store().updateSettings({ algorithmEnabled: false })

    render(<CalendarView />)

    for (const cell of screen.getAllByTestId('day-cell')) {
      expect(cell.className).not.toContain('bg-fertility-status-')
      expect(cell.className).not.toContain('bg-fertility-forecast-bg')
      expect(cell.getAttribute('data-phase')).toBeNull()
    }
    expect(screen.getByTitle('Monitor: high').className).toContain('bg-fertility-monitor-high')
  })

  it('shows a grouped phase-first legend by default', () => {
    render(<CalendarView />)

    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('Fertile')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
    expect(screen.getByText('Menses')).toBeInTheDocument()
    expect(screen.getByText('Monitor')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Peak')).toBeInTheDocument()
    // Provenance and evidence-source cues are gone from the legend.
    expect(screen.queryByText('Assumed')).not.toBeInTheDocument()
    expect(screen.queryByText('Pre-fertile')).not.toBeInTheDocument()
    expect(screen.queryByText('Post-peak')).not.toBeInTheDocument()
    expect(screen.queryByText('Post-calendar')).not.toBeInTheDocument()
  })

  it('reveals the full-detail legend from the Calendar', async () => {
    const user = userEvent.setup()
    render(<CalendarView />)

    await user.click(screen.getByRole('button', { name: /show full detail/i }))

    expect(await screen.findByText('Intercourse')).toBeInTheDocument()
    expect(screen.getByText('Predicted window')).toBeInTheDocument()
    // the single-day ovulation estimate is gone from the vocabulary
    expect(screen.queryByText('Predicted ovulation')).not.toBeInTheDocument()
    // the projected entry appears only once projection is actually painting days
    expect(screen.queryByText('Projected')).not.toBeInTheDocument()
    expect(screen.queryByText('Confirmed source')).not.toBeInTheDocument()
    expect(screen.queryByText('Predicted status')).not.toBeInTheDocument()
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
describe('CalendarView with cycle projection', () => {
  /** Nine cycles of history so the calendar rule applies, then an open cycle. */
  async function seedHistory() {
    let day1 = addDays(todayKey(), -250)
    for (let i = 0; i < 8; i++) {
      const cycle = await store().setNewCycle(day1)
      await store().addDayRecord(cycle.id, addDays(day1, 11), 12, { monitor: 'peak' })
      day1 = addDays(day1, 28)
    }
    await store().setNewCycle(day1)
  }

  it('projects nothing while the setting is off, and touches no stored record', async () => {
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    // paint it once, so there is something that could be left behind
    render(<CalendarView />)
    cleanup()
    const before = { cycles: store().cycles.length, records: store().dayRecords.length }
    const beforeIds = store().dayRecords.map((r) => r.id).sort()

    await store().updateSettings({ projectFutureCycles: false })
    render(<CalendarView />)

    const projected = screen
      .getAllByTestId('day-cell')
      .filter((el) => el.getAttribute('data-forecast') === 'true')
    expect(projected).toHaveLength(0)
    // disabling removes the drawing and nothing else
    expect(store().cycles).toHaveLength(before.cycles)
    expect(store().dayRecords).toHaveLength(before.records)
    expect(store().dayRecords.map((r) => r.id).sort()).toEqual(beforeIds)
  })

  it('paints projected days when the setting is on', async () => {
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    render(<CalendarView />)

    await waitFor(() => {
      const projected = screen
        .getAllByTestId('day-cell')
        .filter((el) => el.getAttribute('data-forecast') === 'true')
      expect(projected.length).toBeGreaterThan(0)
    })
  })

  it('keeps a phase fill on projected days so the window status reads', async () => {
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    render(<CalendarView />)

    await waitFor(() => {
      const projected = screen
        .getAllByTestId('day-cell')
        .filter((el) => el.getAttribute('data-forecast') === 'true')
      // every projected day with a status keeps a real phase fill, and the
      // dashed border is what marks it as not yet happened
      const phased = projected.filter((el) => el.getAttribute('data-phase'))
      expect(phased.length).toBeGreaterThan(0)
      for (const el of phased) {
        expect(el.className).toContain('border-dashed')
      }
    })
  })

  it('leaves no date after today unpainted across paged months', async () => {
    const user = userEvent.setup()
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    render(<CalendarView />)

    // Page well past the current cycle: the chain has to follow, which means
    // the range must cover the whole visible month and not just today. A month
    // grid's final week often falls outside the month entirely.
    for (let page = 0; page < 6; page++) {
      await user.click(screen.getByRole('button', { name: /next month/i }))
      const future = screen
        .getAllByTestId('day-cell')
        .filter((el) => (el.getAttribute('data-date') ?? '') > todayKey())
      expect(future.length).toBeGreaterThan(0)
      for (const el of future) {
        expect(el.getAttribute('data-forecast'), `unpainted ${el.getAttribute('data-date')}`).toBe('true')
      }
    }
  })

  it('projects a whole month that lies beyond the first projected cycle', async () => {
    const user = userEvent.setup()
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    render(<CalendarView />)

    // three months out: the open cycle's own projected length cannot reach here
    for (let page = 0; page < 3; page++) {
      await user.click(screen.getByRole('button', { name: /next month/i }))
    }
    await waitFor(() => {
      const future = screen
        .getAllByTestId('day-cell')
        .filter((el) => (el.getAttribute('data-date') ?? '') > todayKey())
      expect(future.length).toBeGreaterThan(20)
      for (const el of future) {
        expect(el.getAttribute('data-forecast'), `unpainted ${el.getAttribute('data-date')}`).toBe('true')
        // a projected day inside a covered cycle still carries a phase
        expect(el.getAttribute('data-phase')).toBeTruthy()
      }
    })
  })

  it('marks a projected cycle day 1 with the menses stripe', async () => {
    const user = userEvent.setup()
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    render(<CalendarView />)

    for (let page = 0; page < 2; page++) {
      await user.click(screen.getByRole('button', { name: /next month/i }))
    }
    // somewhere in this month a projected cycle begins
    await waitFor(() => {
      const withMenses = screen
        .getAllByTestId('day-cell')
        .filter((el) => el.getAttribute('data-forecast') === 'true')
        .filter((el) => el.querySelector('[data-testid="calendar-menses-stripe"]'))
      expect(withMenses.length).toBeGreaterThan(0)
    })
  })

  it('still shows the existing next-window forecast while the projection is off', async () => {
    // an open cycle recent enough that its forecast window reaches past today
    await seedHistory()
    await store().setNewCycle(addDays(todayKey(), -5))
    await store().updateSettings({ projectFutureCycles: false })
    render(<CalendarView />)

    // the pre-existing overlay is untouched by the new setting
    await waitFor(() => {
      const forecast = screen
        .getAllByTestId('day-cell')
        .filter((el) => el.getAttribute('data-forecast') === 'true')
      expect(forecast.length).toBeGreaterThan(0)
    })
  })

  it('shows no projected output when interpretation is disabled', async () => {
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true, algorithmEnabled: false })
    render(<CalendarView />)

    const projected = screen
      .getAllByTestId('day-cell')
      .filter((el) => el.getAttribute('data-forecast') === 'true')
    expect(projected).toHaveLength(0)
    // the legend's projected entry goes with it
    expect(screen.queryByText('Projected')).not.toBeInTheDocument()
  })

  it('lists a Projected legend entry only while projection is painting days', async () => {
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    render(<CalendarView />)

    expect(await screen.findByText('Projected')).toBeInTheDocument()
    // the sample matches the cells: a phase fill with the dashed forecast border
    const swatch = document.querySelector('[data-legend-label="Projected"]')?.firstElementChild
    expect(swatch?.className).toContain('border-dashed')
    expect(swatch?.className).toContain('bg-fertility-status-fertile')
  })

  it('refuses to log a projected day', async () => {    const user = userEvent.setup()
    stubMatchMedia()
    await seedHistory()
    await store().updateSettings({ projectFutureCycles: true })
    render(
      <>
        <CalendarView />
        <Toaster />
      </>,
    )

    const future = addDays(todayKey(), 3)
    const cell = cellByDate(future)
    expect(cell).not.toBeNull()
    // it is painted as a projected day, and still not loggable
    expect(cell!).toHaveAttribute('data-forecast', 'true')
    await user.click(cell!)
    await waitFor(() => {
      expect(screen.getByText(/future dates cannot be logged/i)).toBeInTheDocument()
    })
    // nothing was written
    expect(store().dayRecords.every((r) => r.date <= todayKey())).toBe(true)
  })
})
