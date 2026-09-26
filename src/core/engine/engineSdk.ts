import { diffDays } from "./dateUtils";
import { computeCycle } from "./marquette";
import { computePredictions } from "./predict";
import type {
  CycleHistory,
  CycleInput,
  CycleResult,
  DateKey,
  DayRecordInput,
  EngineSettings,
  EngineWarning,
} from "./types";

export interface EngineOutput {
  cycles: CycleResult[];
  forecast: ReturnType<typeof computePredictions> | null;
  warnings: EngineWarning[];
}

/**
 * Full-engine entry point. Sorts cycles by day1, assigns cycle numbers,
 * threads the calendar history, computes every cycle and the forecast.
 *
 * `today` bounds each open cycle's day results; it is passed in rather than
 * read from the clock so the engine stays pure.
 *
 * Pure: no I/O, no framework imports.
 */
export function computeAll(
  cycles: CycleInput[],
  dayRecords: DayRecordInput[],
  settings: EngineSettings,
  today: DateKey,
): EngineOutput {
  const sorted = [...cycles].sort((a, b) => (a.day1 < b.day1 ? -1 : a.day1 > b.day1 ? 1 : 0));
  const byCycle = new Map<string, DayRecordInput[]>();
  for (const record of dayRecords) {
    const list = byCycle.get(record.cycleId);
    if (list) {
      list.push(record);
    } else {
      byCycle.set(record.cycleId, [record]);
    }
  }

  const results: CycleResult[] = [];
  const history: CycleHistory = { peaksByCycle: [], cycleNos: [] };

  for (let index = 0; index < sorted.length; index++) {
    const cycle = sorted[index];
    const cycleNo = index + 1;
    const next = sorted[index + 1];
    const length = next ? diffDays(cycle.day1, next.day1) : null;
    const result = computeCycle(
      cycle,
      byCycle.get(cycle.id) ?? [],
      cycleNo,
      length,
      history,
      settings,
      today,
    );
    results.push(result);
    history.peaksByCycle.push(result.peakDay);
    history.cycleNos.push(cycleNo);
  }

  const warnings = collectWarnings(results, settings);
  const forecast = computePredictions(results, settings, today);

  return { cycles: results, forecast, warnings };
}

function collectWarnings(results: CycleResult[], settings: EngineSettings): EngineWarning[] {
  const warnings: EngineWarning[] = [];
  for (const result of results) {
    warnings.push(...result.warnings);
  }
  const outOfBand = results.filter(
    (r) =>
      r.length !== null &&
      (r.length < settings.cycleMinLength || r.length > settings.cycleMaxLength),
  );
  if (outOfBand.length >= 2) {
    for (const result of outOfBand) {
      warnings.push({ kind: "cycle-out-of-band", cycleNo: result.cycleNo, length: result.length! });
    }
  }
  return warnings;
}
