import type { DayStatus, MonitorReading } from '@/core/engine/types'

export type CalendarPhase = 'before' | 'fertile' | 'after'

export interface FertilityStatusVisual {
  fill: string
  foreground: string
  border: string
  badge: string
}

export interface CalendarPhaseVisual {
  label: string
  fill: string
}

export interface FertilityMonitorVisual {
  dot: string
  fill: string
}

export interface FertilityMarkerVisual {
  dot?: string
  stripe?: string
  asterisk?: string
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
    foreground: 'text-fertility-status-pre-fg',
    border: 'border-fertility-status-pre-border',
    badge: 'bg-fertility-status-pre text-fertility-status-pre-fg',
  },
  fertile: {
    fill: 'bg-fertility-status-fertile',
    foreground: 'text-fertility-status-fertile-fg',
    border: 'border-fertility-status-fertile-border',
    badge: 'bg-fertility-status-fertile text-fertility-status-fertile-fg',
  },
  'post-peak': {
    fill: 'bg-fertility-status-post-peak',
    foreground: 'text-fertility-status-post-peak-fg',
    border: 'border-fertility-status-post-peak-border',
    badge: 'bg-fertility-status-post-peak text-fertility-status-post-peak-fg',
  },
  'post-calendar': {
    fill: 'bg-fertility-status-post-calendar',
    foreground: 'text-fertility-status-post-calendar-fg',
    border: 'border-fertility-status-post-calendar-border',
    badge: 'bg-fertility-status-post-calendar text-fertility-status-post-calendar-fg',
  },
}

/**
 * Calendar-only phase treatment; the engine's precise statuses remain unchanged.
 * Each phase deliberately reuses the existing status treatments so the collapsed
 * view can never drift from the palette the other surfaces use.
 */
export const FERTILITY_CALENDAR_PHASE_VISUALS: Record<CalendarPhase, CalendarPhaseVisual> = {
  before: {
    label: 'Before',
    fill: FERTILITY_STATUS_VISUALS['pre-fertile'].fill,
  },
  fertile: {
    label: 'Fertile',
    fill: FERTILITY_STATUS_VISUALS.fertile.fill,
  },
  after: {
    label: 'After',
    fill: FERTILITY_STATUS_VISUALS['post-peak'].fill,
  },
}

export function calendarPhaseForStatus(status: DayStatus): CalendarPhase {
  if (status === 'pre-fertile') {
    return 'before'
  }
  return status === 'fertile' ? 'fertile' : 'after'
}

export function calendarPhaseLabel(phase: CalendarPhase): string {
  return FERTILITY_CALENDAR_PHASE_VISUALS[phase].label
}

/** Shared badge treatment for a status. */
export function fertilityStatusBadge(status: DayStatus): string {
  return FERTILITY_STATUS_VISUALS[status].badge
}

export const FERTILITY_MONITOR_VISUALS: Record<MonitorReading, FertilityMonitorVisual> = {
  none: { dot: 'bg-fertility-monitor-none', fill: 'fill-fertility-monitor-none' },
  low: { dot: 'bg-fertility-monitor-low', fill: 'fill-fertility-monitor-low' },
  high: { dot: 'bg-fertility-monitor-high', fill: 'fill-fertility-monitor-high' },
  peak: { dot: 'bg-fertility-monitor-peak', fill: 'fill-fertility-monitor-peak' },
}

export const FERTILITY_MARKER_VISUALS = {
  menses: {
    dot: 'bg-fertility-marker-menses',
    stripe: 'bg-fertility-marker-menses',
  },
  intercourse: { icon: 'fill-fertility-marker-intercourse text-fertility-marker-intercourse' },
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
