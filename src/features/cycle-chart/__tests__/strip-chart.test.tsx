import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { StripModel } from '../lib'
import { StripChart } from '../strip-chart'
import { installChartShim } from './helpers'

installChartShim()

function bandByDay(day: number): HTMLElement | null {
  return screen.getAllByTestId('day-band').find((el) => Number(el.getAttribute('data-day')) === day) ?? null
}

function day(day: number): StripModel['days'][number] {
  return { day, date: '2026-01-01', monitor: undefined, mucus: undefined, bbt: null, intercourse: false, status: 'pre-fertile', source: 'predicted' }
}

const SPAN = 10

function makeModel(over: Partial<StripModel> = {}): StripModel {
  const days = Array.from({ length: SPAN }, (_, i) => day(i + 1))
  days[2] = { ...days[2] } // day 3 unmonitored (track fill)
  days[4].monitor = 'low' // day 5
  days[6].monitor = 'high' // day 7
  days[8].monitor = 'peak' // day 9
  return {
    cycleId: 'c1',
    cycleNo: 1,
    day1: '2026-01-01',
    open: false,
    span: SPAN,
    days,
    window: null,
    ...over,
  }
}

describe('StripChart', () => {
  afterEach(() => cleanup())

  it('renders one day-band segment per cycle day with day/monitor attributes (FR-001/002)', () => {
    render(<StripChart model={makeModel()} />)
    const bands = screen.getAllByTestId('day-band')
    expect(bands).toHaveLength(SPAN)
    expect(bandByDay(5)?.getAttribute('data-monitor')).toBe('low')
    expect(bandByDay(7)?.getAttribute('data-monitor')).toBe('high')
    expect(bandByDay(9)?.getAttribute('data-monitor')).toBe('peak')
  })

  it("keeps an unmonitored day's slot with a faint track (no collapsing, FR-010)", () => {
    render(<StripChart model={makeModel()} />)
    const bands = screen.getAllByTestId('day-band')
    expect(bands).toHaveLength(SPAN)
    const empty = bandByDay(3)
    expect(empty).not.toBeNull()
    expect(empty?.getAttribute('data-monitor')).toBe('')
  })

it('colors bands per the calendar vocabulary (sky/amber/violet)', () => {
    render(<StripChart model={makeModel()} />)
    expect(bandByDay(5)?.getAttribute('class')).toContain('fill-sky-400')
    expect(bandByDay(7)?.getAttribute('class')).toContain('fill-amber-500')
    expect(bandByDay(9)?.getAttribute('class')).toContain('fill-violet-600')
    expect(bandByDay(3)?.getAttribute('class')).toContain('fill-stone-200')
  })

  it('renders a solid window band (no dashes) when confirmed (SR element data-source)', () => {
    render(
      <StripChart
        model={makeModel({
          window: { begin: 5, end: 9, source: 'confirmed', beginRule: 'first-high-or-peak', endRule: 'current-peak-plus-n' },
        })}
      />,
    )
    const band = screen.getByTestId('fertile-window-band')
    expect(band.getAttribute('data-source')).toBe('confirmed')
    expect(band.getAttribute('data-begin')).toBe('5')
    expect(band.getAttribute('data-end')).toBe('9')
    expect(document.querySelector('.recharts-reference-area-rect')?.getAttribute('stroke-dasharray')).toBeNull()
  })

  it('renders a dashed window band when predicted (SC-002)', () => {
    render(
      <StripChart
        model={makeModel({
          window: { begin: 6, end: 17, source: 'predicted', beginRule: 'calendar-day-6', endRule: 'current-peak-plus-n' },
        })}
      />,
    )
    const band = screen.getByTestId('fertile-window-band')
    expect(band.getAttribute('data-source')).toBe('predicted')
    expect(document.querySelector('.recharts-reference-area-rect')?.getAttribute('stroke-dasharray')).not.toBeNull()
  })

  it('renders NO window band when the window is null (algorithm off, FR-004)', () => {
    render(<StripChart model={makeModel({ window: null })} />)
    expect(screen.queryByTestId('fertile-window-band')).toBeNull()
    expect(document.querySelector('.recharts-reference-area')).toBeNull()
  })

  it('extends the window band to the last day when the end is pending (no Peak)', () => {
    render(
      <StripChart
        model={makeModel({
          window: { begin: 6, end: null, source: 'predicted', beginRule: 'calendar-day-6', endRule: 'none' },
        })}
      />,
    )
    const band = screen.getByTestId('fertile-window-band')
    expect(band.getAttribute('data-end')).toBe('')
  })
})