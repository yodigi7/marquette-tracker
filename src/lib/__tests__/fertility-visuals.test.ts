import { describe, expect, it } from 'vitest'
import type { DayStatus, MonitorReading } from '@/core/engine/types'
import {
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_CALENDAR_PHASE_VISUALS,
  FERTILITY_MARKER_VISUALS,
  FERTILITY_MONITOR_VISUALS,
  FERTILITY_SOURCE_VISUALS,
  FERTILITY_STATUS_VISUALS,
  FERTILITY_TEXT_VISUALS,
  calendarPhaseForStatus,
  calendarPhaseLabel,
  fertilityStatusBadge,
} from '../fertility-visuals'

const statusCases: Array<[DayStatus, string]> = [
  ['pre-fertile', 'pre'],
  ['fertile', 'fertile'],
  ['post-peak', 'post-peak'],
  ['post-calendar', 'post-calendar'],
]

const monitorCases: Array<[MonitorReading, string]> = [
  ['none', 'none'],
  ['low', 'low'],
  ['high', 'high'],
  ['peak', 'peak'],
]

const phaseCases: Array<[DayStatus, 'before' | 'fertile' | 'after', string]> = [
  ['pre-fertile', 'before', 'Before'],
  ['fertile', 'fertile', 'Fertile'],
  ['post-peak', 'after', 'After'],
  ['post-calendar', 'after', 'After'],
]

describe('fertility visual mappings', () => {
  it.each(phaseCases)('maps %s to the %s calendar phase', (status, phase, label) => {
    expect(calendarPhaseForStatus(status)).toBe(phase)
    expect(calendarPhaseLabel(phase)).toBe(label)
  })

  it('reuses the existing status treatments for the three Calendar phases', () => {
    expect(FERTILITY_CALENDAR_PHASE_VISUALS.before.fill).toBe(FERTILITY_STATUS_VISUALS['pre-fertile'].fill)
    expect(FERTILITY_CALENDAR_PHASE_VISUALS.fertile.predictedFill).toBe(
      FERTILITY_STATUS_VISUALS.fertile.predictedFill,
    )
    expect(FERTILITY_CALENDAR_PHASE_VISUALS.after.fill).toBe(FERTILITY_STATUS_VISUALS['post-peak'].fill)
    expect(FERTILITY_CALENDAR_PHASE_VISUALS.after.predictedFill).toBe(
      FERTILITY_STATUS_VISUALS['post-peak'].predictedFill,
    )
    expect(FERTILITY_CALENDAR_PHASE_VISUALS.after.label).toBe('After')
  })

  it.each(statusCases)('maps %s to a complete tokenized treatment', (status, token) => {
    const visual = FERTILITY_STATUS_VISUALS[status]

    expect(visual.fill).toBe(`bg-fertility-status-${token}`)
    expect(visual.predictedFill).toBe(`bg-fertility-status-${token}-predicted`)
    expect(visual.foreground).toBe(`text-fertility-status-${token}-fg`)
    expect(visual.border).toBe(`border-fertility-status-${token}-border`)
    expect(visual.badge).toContain(visual.fill)
    expect(visual.badge).toContain(visual.foreground)
  })

  it('selects the predicted status treatment for a predicted source', () => {
    expect(fertilityStatusBadge('fertile', 'confirmed')).toBe(FERTILITY_STATUS_VISUALS.fertile.badge)
    expect(fertilityStatusBadge('fertile', 'predicted')).toBe(
      'bg-fertility-status-fertile-predicted text-fertility-status-fertile-fg',
    )
  })

  it('maps confirmed and predicted source cues to distinct border styles', () => {
    expect(FERTILITY_SOURCE_VISUALS.confirmed.cellBorder).toBe('border-fertility-source-confirmed')
    expect(FERTILITY_SOURCE_VISUALS.predicted.cellBorder).toBe('border-dashed border-fertility-source-predicted')
    expect(FERTILITY_SOURCE_VISUALS.confirmed.text).toBe('text-fertility-source-confirmed')
    expect(FERTILITY_SOURCE_VISUALS.predicted.text).toBe('text-fertility-source-predicted')
  })

  it.each(monitorCases)('maps monitor %s to dot and chart-fill tokens', (reading, token) => {
    const visual = FERTILITY_MONITOR_VISUALS[reading]

    expect(visual.dot).toBe(`bg-fertility-monitor-${token}`)
    expect(visual.fill).toBe(`fill-fertility-monitor-${token}`)
  })

  it('keeps raw markers, forecast, and text roles tokenized', () => {
    expect(FERTILITY_MARKER_VISUALS.menses.dot).toBe('bg-fertility-marker-menses')
    expect(FERTILITY_MARKER_VISUALS.menses.stripe).toBe('bg-fertility-marker-menses')
    expect(FERTILITY_MARKER_VISUALS.intercourse.icon).toContain('fertility-marker-intercourse')
    expect(FERTILITY_MARKER_VISUALS.assumed.dot).toContain('fertility-marker-assumed')
    expect(FERTILITY_MARKER_VISUALS.assumed.asterisk).toBe('text-fertility-marker-assumed')
    expect(FERTILITY_MARKER_VISUALS.ovulation.dot).toContain('fertility-forecast-border')
    expect(FERTILITY_FORECAST_VISUAL.fill).toBe('bg-fertility-forecast-bg')
    expect(FERTILITY_FORECAST_VISUAL.cellBorder).toBe('border-dashed border-fertility-forecast-border')
    expect(FERTILITY_FORECAST_VISUAL.text).toBe('text-fertility-forecast-fg')
    expect(FERTILITY_FORECAST_VISUAL.windowFill).toBe('var(--fertility-window-fill)')
    expect(FERTILITY_FORECAST_VISUAL.windowBorder).toBe('var(--fertility-window-border)')
    expect(FERTILITY_TEXT_VISUALS.muted).toBe('text-fertility-muted')
    expect(FERTILITY_TEXT_VISUALS.body).toBe('text-fertility-body')
    expect(FERTILITY_TEXT_VISUALS.warning).toBe('text-fertility-warning')
  })
})
