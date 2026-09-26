import type { DateKey, CycleResult } from '@/core/engine/types'
import type { EngineOutput } from '@/core/engine/engineSdk'
import type { CycleEntity } from './entities'

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