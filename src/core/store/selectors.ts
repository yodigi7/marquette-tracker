import { projectCycles } from '@/core/engine/projection'
import type { DateKey, CycleResult } from '@/core/engine/types'
import type { EngineSettings } from '@/core/engine/types'
import type { EngineOutput } from '@/core/engine/engineSdk'
import type { CycleEntity, SettingsEntity } from './entities'

/** Protocol parameters the engine needs, lifted from the persisted settings row. */
export function engineSettingsOf(settings: SettingsEntity): EngineSettings {
  return {
    postPeakDays: settings.postPeakDays,
    historyWindow: settings.historyWindow,
    cycleMinLength: settings.cycleMinLength,
    cycleMaxLength: settings.cycleMaxLength,
  }
}

/** Latest cycle whose day1 is at or before the given date. */
export function cycleForDate(cycles: CycleEntity[], date: DateKey): CycleEntity | undefined {
  for (let index = cycles.length - 1; index >= 0; index--) {
    if (cycles[index].day1 <= date) {
      return cycles[index]
    }
  }
  return undefined
}

/** Latest cycle that is still open (no closedAt). */
export function latestOpenCycle(cycles: CycleEntity[]): CycleEntity | undefined {
  for (let index = cycles.length - 1; index >= 0; index--) {
    if (cycles[index].closedAt === null) {
      return cycles[index]
    }
  }
  return undefined
}

/** Engine results indexed by cycleId for O(1) lookups from features. */
export function cycleResultsByCycleId(output: EngineOutput | null): Map<string, CycleResult> {
  const map = new Map<string, CycleResult>()
  if (!output) {
    return map
  }
  for (const cycle of output.cycles) {
    map.set(cycle.cycleId, cycle)
  }
  return map
}

/**
 * Projected cycles covering `untilDate`, or none when the setting is off.
 *
 * Derived here rather than in the store's single `computeAll` pass because the
 * range belongs to the view: the Calendar asks for the month it is showing, so
 * the chain can be followed as far as the user pages without a fixed horizon.
 * A projected cycle is never stored and never added to the real cycle list.
 */
export function projectedCyclesThrough(
  output: EngineOutput | null,
  settings: SettingsEntity,
  today: DateKey,
  untilDate: DateKey,
): CycleResult[] {
  if (!output || !settings.projectFutureCycles) {
    return []
  }
  return projectCycles(output.cycles, engineSettingsOf(settings), today, untilDate)
}