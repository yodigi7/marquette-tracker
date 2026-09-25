import { Bar, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Scatter, XAxis, YAxis } from 'recharts'
import type { ReactElement } from 'react'
import type { MucusLevel } from '@/core/engine/types'
import {
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_MONITOR_VISUALS,
} from '@/lib/fertility-visuals'
import { bbtSeries, intercourseSeries, mucusSeries } from './lib'
import type { StripDay, StripModel, StripWindow } from './lib'

const BAND_FILL: Record<string, string> = {
  none: FERTILITY_MONITOR_VISUALS.none.fill,
  low: FERTILITY_MONITOR_VISUALS.low.fill,
  high: FERTILITY_MONITOR_VISUALS.high.fill,
  peak: FERTILITY_MONITOR_VISUALS.peak.fill,
}

const MUCUS_FILL: Record<MucusLevel, string> = {
  none: 'fill-fertility-overlay-mucus-none',
  low: 'fill-fertility-overlay-mucus-low',
  high: 'fill-fertility-overlay-mucus-high',
  peak: 'fill-fertility-overlay-mucus-peak',
}

const BBT_STROKE = 'var(--fertility-overlay-bbt)'

/** Half-band pad keeps the first/last segments fully inside the plot area. */
const X_PAD = 0.5
/** Nominal pixel width of one cycle day; wide enough to read day numbers. */
const DAY_W = 28
const CHART_H = 240

interface BandDatum {
  day: number
  value: 1
  monitor?: StripDay['monitor']
  bbt?: number
}

/** Structural supertype of Recharts' BarShapeProps — only the fields we render. */
interface DayBandShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: unknown
}

function DayBandShape({ x, y, width, height, payload }: DayBandShapeProps): ReactElement {
  const datum = payload as Partial<BandDatum> | null
  const monitor = datum?.monitor ?? 'none'
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={2}
      className={BAND_FILL[monitor] ?? BAND_FILL.none}
      data-testid="day-band"
      data-day={datum?.day}
      data-monitor={datum?.monitor ?? ''}
    />
  )
}

/** Structural supertype of Recharts' Line dot / Scatter shape props. */
interface OverlayShapeProps {
  cx?: number
  cy?: number
  payload?: unknown
}

type BbtDatum = { day?: number; bbt?: number }

function BbtPoint({ cx, cy, payload }: OverlayShapeProps): ReactElement {
  const datum = payload as BbtDatum | null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      className="fill-fertility-overlay-bbt"
      data-testid="overlay-bbt-point"
      data-day={datum?.day}
      data-bbt={datum?.bbt}
    />
  )
}

type MucusDatum = { day?: number; level?: MucusLevel }

function MucusPoint({ cx, cy, payload }: OverlayShapeProps): ReactElement {
  const datum = payload as MucusDatum | null
  const level = datum?.level ?? 'none'
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      className={MUCUS_FILL[level]}
      data-testid="overlay-mucus-point"
      data-day={datum?.day}
      data-level={level}
    />
  )
}

function IntercoursePoint({ cx, cy, payload }: OverlayShapeProps): ReactElement {
  const datum = payload as { day?: number } | null
  return (
    <circle cx={cx} cy={cy} r={3} className="fill-fertility-overlay-intercourse" data-testid="overlay-intercourse-point" data-day={datum?.day} />
  )
}

interface StripChartProps {
  model: StripModel
  showMucus?: boolean
  showBbt?: boolean
  showIntercourse?: boolean
}

export function StripChart({ model, showMucus = false, showBbt = false, showIntercourse = false }: StripChartProps): ReactElement {
  const span = Math.max(model.span, 1)
  const data: BandDatum[] = model.days.map((d) => ({ day: d.day, value: 1, monitor: d.monitor, bbt: d.bbt ?? undefined }))
  const ticks = Array.from({ length: span }, (_, i) => i + 1)
  const xMax = span + X_PAD
  const window = model.window
  const bbt = bbtSeries(model.days)
  const bbtValues = bbt.map((p) => p.bbt)
  const bbtDomain: [number, number] =
    bbtValues.length > 0 ? [Math.min(...bbtValues) - 0.2, Math.max(...bbtValues) + 0.2] : [36, 37]
  // Distinct y lanes across the hidden [0,2] axis keep the two marker types from
  // overlapping: mucus rides the strip's top edge (y=1), intercourse sits lower in the strip.
  const mucus = mucusSeries(model.days).map((p) => ({ x: p.day, y: 1, day: p.day, level: p.level }))
  const intercourse = intercourseSeries(model.days).map((p) => ({ x: p.day, y: 0.66, day: p.day }))

  return (
    <div className="overflow-x-auto" data-testid="cycle-strip">
      <div style={{ minWidth: `${span * DAY_W}px` }}>
        <ResponsiveContainer width="100%" height={CHART_H}>
          <ComposedChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
            <XAxis
              type="number"
              dataKey="day"
              domain={[X_PAD, xMax]}
              ticks={ticks}
              interval={0}
              tickLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis hide domain={[0, 2]} />
            {window && (
              <ReferenceArea
                x1={window.begin - X_PAD}
                x2={(window.end ?? span) + X_PAD}
                y1={0}
                y2={2}
                fill={FERTILITY_FORECAST_VISUAL.windowFill}
                stroke={FERTILITY_FORECAST_VISUAL.windowBorder}
                strokeWidth={1}
                strokeDasharray={window.source === 'predicted' ? '4 3' : undefined}
                ifOverflow="extendDomain"
              />
            )}
            <Bar dataKey="value" isAnimationActive={false} shape={DayBandShape} />
            {showBbt && (
              <Line
                yAxisId="bbt"
                type="monotone"
                data={bbt}
                dataKey="bbt"
                stroke={BBT_STROKE}
                strokeWidth={1.5}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={false}
                dot={<BbtPoint />}
              />
            )}
            {/* Recharts v3 falls back to the chart-level day-band data when a Scatter's data is
                empty, drawing a phantom marker on every day. Skip rendering entirely when a
                series has no entries instead. */}
            {showMucus && mucus.length > 0 && (
              <Scatter data={mucus} dataKey="y" isAnimationActive={false} shape={MucusPoint} />
            )}
            {showIntercourse && intercourse.length > 0 && (
              <Scatter data={intercourse} dataKey="y" isAnimationActive={false} shape={IntercoursePoint} />
            )}
            {showBbt && (
              <YAxis
                yAxisId="bbt"
                orientation="right"
                type="number"
                dataKey="bbt"
                domain={bbtDomain}
                width={34}
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {window && (
          <span className="sr-only" data-testid="fertile-window-band" data-begin={window.begin} data-end={window.end ?? ''} data-source={window.source}>
            {windowLabel(window)}
          </span>
        )}
      </div>
    </div>
  )
}

function windowLabel(window: StripWindow): string {
  const label = window.source === 'confirmed' ? 'Confirmed fertile' : 'Predicted fertile'
  const end = window.end !== null ? `day ${window.end}` : 'an unknown day (no Peak yet)'
  return `${label} window from day ${window.begin} to ${end}.`
}