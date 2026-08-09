import { diffDays } from './dateUtils'
import { CYCLE_LENGTH_MAX, CYCLE_LENGTH_MIN, computeCycle } from './marquette'
import { computePredictions } from './predict'
import type { CycleHistory, CycleInput, CycleResult, DayRecordInput, EngineSettings, EngineWarning } from './types'

export interface EngineOutput {
  cycles: CycleResult[]
  forecast: ReturnType<typeof computePredictions> | null
  warnings: EngineWarning[]
}

/**
 * Full-engine entry point. Sorts cycles by day1, assigns cycle numbers,
 * threads the calendar history, computes every cycle and the forecast.
 *
 * Pure: no I/O, no framework imports.
 */
export function computeAll(
  cycles: CycleInput[],
  dayRecords: DayRecordInput[],
  settings: EngineSettings,
): EngineOutput {
  const sorted = [...cycles].sort((a, b) => (a.day1 < b.day1 ? -1 : a.day1 > b.day1 ? 1 : 0))
  const byCycle = new Map<string, DayRecordInput[]>()
  for (const record of dayRecords) {
    const list = byCycle.get(record.cycleId)
    if (list) {
      list.push(record)
    } else {
      byCycle.set(record.cycleId, [record])
    }
  }

  const results: CycleResult[] = []
  const history: CycleHistory = { peaksByCycle: [], cycleNos: [] }

  for (let index = 0; index < sorted.length; index++) {
    const cycle = sorted[index]
    const cycleNo = index + 1
    const next = sorted[index + 1]
    const length = next ? diffDays(cycle.day1, next.day1) : null
    const result = computeCycle(cycle, byCycle.get(cycle.id) ?? [], cycleNo, length, history, settings)
    results.push(result)
    history.peaksByCycle.push(result.peakDay)
    history.cycleNos.push(cycleNo)
  }

  const warnings = collectWarnings(results)
  const forecast = computePredictions(results, settings)

  return { cycles: results, forecast, warnings }
}

function collectWarnings(results: CycleResult[]): EngineWarning[] {
  const warnings: EngineWarning[] = []
  for (const result of results) {
    warnings.push(...result.warnings)
  }
  const outOfBand = results.filter(
    (r) => r.length !== null && (r.length < CYCLE_LENGTH_MIN || r.length > CYCLE_LENGTH_MAX),
  )
  if (outOfBand.length >= 2) {
    for (const result of outOfBand) {
      warnings.push({ kind: 'cycle-out-of-band', cycleNo: result.cycleNo, length: result.length! })
    }
  }
  return warnings
}