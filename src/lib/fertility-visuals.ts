import type { DayStatus, MonitorReading } from '@/core/engine/types'

export type FertilitySource = 'confirmed' | 'predicted'

export interface FertilityStatusVisual {
  fill: string
  predictedFill: string
  foreground: string
  border: string
  badge: string
}

export interface FertilitySourceVisual {
  cellBorder: string
  text: string
  badge: string
}

export interface FertilityMonitorVisual {
  dot: string
  fill: string
}

export interface FertilityMarkerVisual {
  dot?: string
  icon?: string
}

export interface FertilityForecastVisual {
  fill: string
  cellBorder: string
  text: string
  /** CSS custom properties used by the Recharts reference area. */
  windowFill: string
  windowBorder: string
}

/**
 * Theme-neutral class names for fertility presentation. The corresponding
 * light/dark values live in `src/index.css`, so callers do not branch on theme.
 */
export const FERTILITY_STATUS_VISUALS: Record<DayStatus, FertilityStatusVisual> = {
  'pre-fertile': {
    fill: 'bg-fertility-status-pre',
    predictedFill: 'bg-fertility-status-pre-predicted',
    foreground: 'text-fertility-status-pre-fg',
    border: 'border-fertility-status-pre-border',
    badge: 'bg-fertility-status-pre text-fertility-status-pre-fg',
  },
  fertile: {
    fill: 'bg-fertility-status-fertile',
    predictedFill: 'bg-fertility-status-fertile-predicted',
    foreground: 'text-fertility-status-fertile-fg',
    border: 'border-fertility-status-fertile-border',
    badge: 'bg-fertility-status-fertile text-fertility-status-fertile-fg',
  },
  'post-peak': {
    fill: 'bg-fertility-status-post-peak',
    predictedFill: 'bg-fertility-status-post-peak-predicted',
    foreground: 'text-fertility-status-post-peak-fg',
    border: 'border-fertility-status-post-peak-border',
    badge: 'bg-fertility-status-post-peak text-fertility-status-post-peak-fg',
  },
  'post-calendar': {
    fill: 'bg-fertility-status-post-calendar',
    predictedFill: 'bg-fertility-status-post-calendar-predicted',
    foreground: 'text-fertility-status-post-calendar-fg',
    border: 'border-fertility-status-post-calendar-border',
    badge: 'bg-fertility-status-post-calendar text-fertility-status-post-calendar-fg',
  },
}

/** Shared badge treatment for a status, accounting for its evidence source. */
export function fertilityStatusBadge(status: DayStatus, source: FertilitySource | null): string {
  const visual = FERTILITY_STATUS_VISUALS[status]
  return source === 'predicted' ? `${visual.predictedFill} ${visual.foreground}` : visual.badge
}

export const FERTILITY_SOURCE_VISUALS: Record<FertilitySource, FertilitySourceVisual> = {
  confirmed: {
    cellBorder: 'border-fertility-source-confirmed',
    text: 'text-fertility-source-confirmed',
    badge: 'border-fertility-source-confirmed text-fertility-source-confirmed',
  },
  predicted: {
    cellBorder: 'border-dashed border-fertility-source-predicted',
    text: 'text-fertility-source-predicted',
    badge: 'border-fertility-source-predicted text-fertility-source-predicted',
  },
}

export const FERTILITY_MONITOR_VISUALS: Record<MonitorReading, FertilityMonitorVisual> = {
  none: { dot: 'bg-fertility-monitor-none', fill: 'fill-fertility-monitor-none' },
  low: { dot: 'bg-fertility-monitor-low', fill: 'fill-fertility-monitor-low' },
  high: { dot: 'bg-fertility-monitor-high', fill: 'fill-fertility-monitor-high' },
  peak: { dot: 'bg-fertility-monitor-peak', fill: 'fill-fertility-monitor-peak' },
}

export const FERTILITY_MARKER_VISUALS = {
  menses: { dot: 'bg-fertility-marker-menses' },
  intercourse: { icon: 'fill-fertility-marker-intercourse text-fertility-marker-intercourse' },
  assumed: { dot: 'border border-dashed border-fertility-marker-assumed' },
  ovulation: { dot: 'border-2 border-fertility-forecast-border bg-fertility-ovulation' },
} as const

export const FERTILITY_FORECAST_VISUAL: FertilityForecastVisual = {
  fill: 'bg-fertility-forecast-bg',
  cellBorder: 'border-dashed border-fertility-forecast-border',
  text: 'text-fertility-forecast-fg',
  windowFill: 'var(--fertility-window-fill)',
  windowBorder: 'var(--fertility-window-border)',
}

export const FERTILITY_TEXT_VISUALS = {
  muted: 'text-fertility-muted',
  body: 'text-fertility-body',
  warning: 'text-fertility-warning',
} as const
