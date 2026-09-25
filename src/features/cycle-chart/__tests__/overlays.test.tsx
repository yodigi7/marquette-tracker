import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useAppStore } from '@/core/store/useAppStore'
import type { StripModel } from '../lib'
import { CycleChartView } from '../index'
import { StripChart } from '../strip-chart'
import { installChartShim, seedCycles } from './helpers'

installChartShim()

function day(day: number): StripModel['days'][number] {
  return {
    day,
    date: '2026-01-01',
    monitor: day === 14 ? 'peak' : undefined,
    mucus: undefined,
    bbt: null,
    intercourse: false,
    status: 'pre-fertile',
    source: 'predicted',
  }
}

function makeModel(): StripModel {
  const days = Array.from({ length: 20 }, (_, i) => day(i + 1))
  const bbt: Record<number, number> = { 8: 36.5, 9: 36.4, 10: 36.6, 11: 36.5, 13: 36.8, 14: 37.0, 15: 37.1 }
  for (const [d, value] of Object.entries(bbt)) {
    days[Number(d) - 1].bbt = value
  }
  days[7].mucus = 'low' // day 8
  days[11].mucus = 'high' // day 12
  days[13].mucus = 'peak' // day 14
  days[14].mucus = 'none' // day 15 explicit none
  days[17].intercourse = true // day 18
  return {
    cycleId: 'c1',
    cycleNo: 1,
    day1: '2026-01-01',
    open: false,
    span: 20,
    days,
    window: { begin: 8, end: 17, source: 'predicted', beginRule: 'calendar-day-6', endRule: 'current-peak-plus-n' },
  }
}

function makeNoMucusOrSexModel(): StripModel {
  return { ...makeModel(), days: Array.from({ length: 20 }, (_, i) => day(i + 1)) }
}

function renderStrip(model: StripModel, over: Partial<{ showMucus: boolean; showBbt: boolean; showIntercourse: boolean }>) {
  return render(
    <StripChart
      model={model}
      showMucus={over.showMucus ?? false}
      showBbt={over.showBbt ?? false}
      showIntercourse={over.showIntercourse ?? false}
    />,
  )
}

function daysOf(testid: string): number[] {
  return screen.getAllByTestId(testid).map((el) => Number(el.getAttribute('data-day')))
}

describe('StripChart overlays (US2)', () => {
  afterEach(() => cleanup())

  it('BBT overlay: one point per value, gap day absent, values correct (FR-006)', () => {
    const model = makeModel()
    renderStrip(model, { showBbt: true })
    expect(daysOf('overlay-bbt-point')).toEqual([8, 9, 10, 11, 13, 14, 15])
    const day14 = screen.getAllByTestId('overlay-bbt-point').find((el) => Number(el.getAttribute('data-day')) === 14)
    expect(day14?.getAttribute('data-bbt')).toBe('37')
    expect(day14?.getAttribute('class')).toContain('fill-fertility-overlay-bbt')
    expect(document.querySelector('.recharts-line-curve')?.getAttribute('stroke')).toBe('var(--fertility-overlay-bbt)')
    expect(screen.getAllByTestId('day-band')).toHaveLength(20)
  })

  it('mucus overlay: one marker per level incl. explicit none, correct data-level', () => {
    renderStrip(makeModel(), { showMucus: true })
    const points = screen.getAllByTestId('overlay-mucus-point')
    expect(points).toHaveLength(4)
    const levels = Object.fromEntries(points.map((el) => [Number(el.getAttribute('data-day')), el.getAttribute('data-level')]))
    expect(levels).toEqual({ 8: 'low', 12: 'high', 14: 'peak', 15: 'none' })
    expect(points.map((el) => el.getAttribute('class'))).toEqual([
      expect.stringContaining('fill-fertility-overlay-mucus-low'),
      expect.stringContaining('fill-fertility-overlay-mucus-high'),
      expect.stringContaining('fill-fertility-overlay-mucus-peak'),
      expect.stringContaining('fill-fertility-overlay-mucus-none'),
    ])
  })

  it('intercourse overlay: one teal marker per act day', () => {
    renderStrip(makeModel(), { showIntercourse: true })
    expect(daysOf('overlay-intercourse-point')).toEqual([18])
    expect(screen.getByTestId('overlay-intercourse-point').getAttribute('class')).toContain('fill-fertility-overlay-intercourse')
  })

  it('mucus and intercourse markers sit inside the plot area, not clipped at the top', () => {
    renderStrip(makeModel(), { showMucus: true, showIntercourse: true })
    for (const testid of ['overlay-mucus-point', 'overlay-intercourse-point']) {
      for (const el of screen.getAllByTestId(testid)) {
        const cy = Number(el.getAttribute('cy'))
        expect(Number.isFinite(cy)).toBe(true)
        expect(cy).toBeGreaterThan(0)
        expect(cy).toBeLessThan(240)
      }
    }
  })

  it('a cycle with no mucus/intercourse records renders no overlay markers (no chart-data fallback)', () => {
    renderStrip(makeNoMucusOrSexModel(), { showMucus: true, showIntercourse: true })
    expect(screen.queryByTestId('overlay-mucus-point')).toBeNull()
    expect(screen.queryByTestId('overlay-intercourse-point')).toBeNull()
    expect(screen.getAllByTestId('day-band')).toHaveLength(20)
  })

  it('mucus and intercourse markers use separate lanes so they never overlap', () => {
    renderStrip(makeModel(), { showMucus: true, showIntercourse: true })
    const mucusCy = new Set(screen.getAllByTestId('overlay-mucus-point').map((el) => el.getAttribute('cy')))
    const sexCy = new Set(screen.getAllByTestId('overlay-intercourse-point').map((el) => el.getAttribute('cy')))
    expect([...mucusCy].some((cy) => sexCy.has(cy))).toBe(false)
  })

  it('toggling props only adds/removes their own markers; bands and window are untouched', () => {
    renderStrip(makeModel(), { showBbt: true })
    expect(daysOf('overlay-bbt-point')).toHaveLength(7)
    expect(screen.queryByTestId('overlay-mucus-point')).toBeNull()
    expect(screen.queryByTestId('overlay-intercourse-point')).toBeNull()
    expect(screen.getAllByTestId('day-band')).toHaveLength(20)
    expect(screen.getByTestId('fertile-window-band')).toBeInTheDocument()
  })
})

describe('CycleChartView overlay settings (US4)', () => {
  function renderAt(cycleId: string) {
    return render(
      <MemoryRouter initialEntries={[`/cycle/${cycleId}`]}>
        <Routes>
          <Route path="/cycle/:cycleId" element={<CycleChartView />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  afterEach(() => cleanup())

  it('initializes overlays from saved settings (no toggle needed)', async () => {
    const { a } = await seedCycles()
    await useAppStore
      .getState()
      .updateSettings({ overlayMucus: true, overlayBbt: true, overlayIntercourse: true })
    renderAt(a)
    expect(daysOf('overlay-mucus-point')).toEqual([14])
    expect(daysOf('overlay-bbt-point')).toHaveLength(7)
    expect(daysOf('overlay-intercourse-point')).toEqual([18])
  })

  it('overlay toggles persist back to settings', async () => {
    const user = userEvent.setup()
    const { a } = await seedCycles()
    renderAt(a)
    expect(screen.queryByTestId('overlay-mucus-point')).toBeNull()
    await user.click(screen.getAllByRole('switch')[0])
    expect((await screen.findAllByTestId('overlay-mucus-point'))[0]).toBeInTheDocument()
    expect(useAppStore.getState().settings.overlayMucus).toBe(true)
  })
})