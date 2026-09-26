import type { EngineOutput } from "@/core/engine/engineSdk";
import type { CycleEntity, DayRecordEntity } from "@/core/store/entities";
import { cycleForDate, cycleResultsByCycleId } from "@/core/store/selectors";

export function autoOpenStorageKey(date: string): string {
  return `marquette-calendar-auto-open:${date}`;
}

export function shouldAutoOpenToday(
  date: string,
  cycles: CycleEntity[],
  dayRecords: DayRecordEntity[],
  output: EngineOutput | null,
  consumed: boolean,
): boolean {
  if (consumed || dayRecords.some((record) => record.date === date)) {
    return false;
  }

  const cycle = cycleForDate(cycles, date);
  if (!cycle) {
    return true;
  }

  return cycleResultsByCycleId(output).get(cycle.id)?.peakDay === null;
}
