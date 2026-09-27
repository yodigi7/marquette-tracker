import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dayInfo } from "@/core/cycleStatus";
import { cycleForDate, cycleResultsByCycleId } from "@/core/store/selectors";
import { useAppStore } from "@/core/store/useAppStore";
import { FERTILITY_TEXT_VISUALS } from "@/lib/fertility-visuals";
import { cn } from "@/lib/utils";
import {
  dateKeyLocal,
  dayInCycle,
  expectedPeakRangeLine,
  parseDateKey,
  peakCountLine,
  todayKey,
  windowDescription,
} from "./lib";
import { StatusCard } from "./status-card";

export function StatusView() {
  const cycles = useAppStore((state) => state.cycles);
  const dayRecords = useAppStore((state) => state.dayRecords);
  const output = useAppStore((state) => state.output);
  const algorithmEnabled = useAppStore((state) => state.settings.algorithmEnabled);
  const [selected, setSelected] = useState(todayKey());
  const results = cycleResultsByCycleId(output);
  const cycle = cycleForDate(cycles, selected);
  const cycleDay = cycle ? dayInCycle(cycle.day1, selected) : null;
  const result = cycle ? results.get(cycle.id) : undefined;
  const info =
    result && cycleDay !== null
      ? dayInfo(result.fertileWindow, result.peakDay !== null, cycleDay)
      : null;
  // How many monitor Peak readings this cycle holds. The engine reports only the one it
  // anchors on, and a count that does not mention the others reads as though one is all there is.
  const peakReadings = cycle
    ? dayRecords.filter((r) => r.cycleId === cycle.id && r.monitor === "peak").length
    : 0;
  // A count may not assert that days have elapsed when they have not, and the picker offers
  // future dates, so the count is bounded by today rather than by the selection.
  const todayCycleDay = cycle ? dayInCycle(cycle.day1, todayKey()) : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex justify-between">
        <p className={cn("text-sm", FERTILITY_TEXT_VISUALS.muted)}>Status</p>
        <DatePicker date={selected} onChange={setSelected} />
      </div>
      {cycle && cycleDay !== null ? (
        <>
          <p className={cn("text-sm", FERTILITY_TEXT_VISUALS.muted)}>
            Cycle {cycle.cycleNo} · day {cycleDay}
          </p>
          <StatusCard
            status={info ?? null}
            cycleDay={cycleDay}
            windowLine={
              result ? windowDescription(result.fertileWindow, result.peakDay !== null) : ""
            }
            // Passed unconditionally, like the warning and the next-period estimate: the card
            // returns early when interpretation is off, and that is what suppresses them.
            peakLine={
              result && todayCycleDay !== null
                ? peakCountLine({
                    peakDay: result.peakDay,
                    cycleDay,
                    todayCycleDay,
                    peaks: peakReadings,
                  })
                : null
            }
            rangeLine={expectedPeakRangeLine(output?.forecast ?? null)}
            nextPeriod={output?.forecast?.expectedPeriodStart ?? null}
            algorithmEnabled={algorithmEnabled}
            warnings={result?.warnings ?? []}
            windowEnd={result?.fertileWindow.end ?? null}
          />
        </>
      ) : (
        <p className={cn("text-sm", FERTILITY_TEXT_VISUALS.muted)}>No cycle data for {selected}.</p>
      )}
    </div>
  );
}

function DatePicker({ date, onChange }: { date: string; onChange(date: string): void }) {
  const parsed = parseDateKey(date);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" data-testid="date-trigger">
          {date}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(value) => value && onChange(dateKeyLocal(value))}
        />
      </PopoverContent>
    </Popover>
  );
}
