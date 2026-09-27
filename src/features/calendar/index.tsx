import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FERTILITY_TEXT_VISUALS } from "@/lib/fertility-visuals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayInCycle, todayKey } from "@/core/dateKeys";
import { dayInfo } from "@/core/cycleStatus";
import { isMensesFlow, planCycles } from "@/core/engine/placement";
import {
  cycleForDate,
  cycleResultsByCycleId,
  projectedCyclesThrough,
} from "@/core/store/selectors";
import { useAppStore } from "@/core/store/useAppStore";
import type { CalendarLayerId, CycleEntity, DayRecordEntity } from "@/core/store/entities";
import { DayCell } from "./day-cell";
import { CalendarSummary } from "./summary";
import { autoOpenStorageKey, shouldAutoOpenToday } from "./auto-open";
import { monthGrid, monthTitle, resolveCell, shiftMonth, weekdayLabels } from "./grid";
import { QuickEntry } from "./quick-entry";
import {
  hasHiddenOnScreen,
  HOLLOW_SWATCH,
  hiddenOutsideOffered,
  LAYER_PAINT,
  isLayerShown,
  LAYER_GROUP_LABELS,
  LAYER_GROUPS,
  offeredLayers,
  swatchSample,
  toggleLayer,
  type CalendarLayer,
} from "./layers";

export function CalendarView() {
  const cycles = useAppStore((s) => s.cycles);
  const dayRecords = useAppStore((s) => s.dayRecords);
  const output = useAppStore((s) => s.output);
  const interpreted = useAppStore((s) => s.settings.algorithmEnabled);
  const settings = useAppStore((s) => s.settings);
  const detailMode = useAppStore((s) => s.settings.calendarDetailMode);
  const hiddenLayers = useAppStore((s) => s.settings.hiddenCalendarLayers);
  const updateSettings = useAppStore((s) => s.updateSettings);
  // The keys the legend can offer right now. `Show all` is scoped to these, so a
  // stored choice for a key that is not on screen is left alone.
  const offered = offeredLayers({ interpreted, detailMode });
  const weekStart = useAppStore((s) => s.settings.weekStart);

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const autoOpenAttempted = useRef(false);
  const today = todayKey();
  const grid = monthGrid(cursor.year, cursor.month, weekStart);
  const results = cycleResultsByCycleId(output);
  const forecast = output?.forecast?.nextFertileWindow;
  // The chain is derived for the month on screen, so paging forward keeps
  // working with no fixed horizon. See projectedCyclesThrough.
  // The last grid week can fall entirely outside the month, so take the last
  // in-month date across every row rather than the final row's last entry.
  const rangeEnd = grid.weeks.flat().filter(Boolean).pop() ?? today;
  const projected = useMemo(
    () => projectedCyclesThrough(output, settings, today, rangeEnd),
    [output, settings, today, rangeEnd],
  );
  const currentCycle = cycleForDate(cycles, today);
  const currentCycleDay = currentCycle ? dayInCycle(currentCycle.day1, today) : null;
  const currentResult = currentCycle ? results.get(currentCycle.id) : undefined;
  const currentInfo =
    currentCycle && currentResult && currentCycleDay !== null
      ? dayInfo(currentResult.fertileWindow, currentResult.peakDay !== null, currentCycleDay)
      : null;
  const currentRecord = currentCycle
    ? dayRecords.find((record) => record.cycleId === currentCycle.id && record.date === today)
    : undefined;

  useEffect(() => {
    if (autoOpenAttempted.current) {
      return;
    }
    autoOpenAttempted.current = true;
    const key = autoOpenStorageKey(today);
    const consumed = sessionStorage.getItem(key) !== null;
    if (!shouldAutoOpenToday(today, cycles, dayRecords, output, consumed)) {
      return;
    }
    sessionStorage.setItem(key, "consumed");
    setSelected(today);
  }, [cycles, dayRecords, output, today]);

  function onSelectDate(date: string) {
    if (date > today) {
      toast("Future dates cannot be logged");
      return;
    }
    setSelected(date);
  }

  const selectedCycle = selected ? cycleForDate(cycles, selected) : undefined;
  const selectedRecord = selected ? dayRecords.find((r) => r.date === selected) : undefined;
  const pending =
    selected && !selectedCycle ? pendingPlacement(cycles, dayRecords, selected) : null;
  const selectedDay =
    selectedCycle && selected ? dayInCycle(selectedCycle.day1, selected) : (pending?.day ?? 1);

  return (
    <div className="mx-auto w-full max-w-lg space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          aria-label="Previous month"
          onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{monthTitle(cursor.year, cursor.month)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
          >
            Today
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-label="Next month"
          onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <CalendarSummary
        cycle={currentCycle}
        cycleDay={currentCycleDay}
        info={currentInfo}
        monitor={currentRecord?.monitor}
        interpreted={interpreted}
      />

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels(weekStart).map((label) => (
          <div
            key={label}
            className={cn("pb-1 text-center text-[11px] font-medium", FERTILITY_TEXT_VISUALS.muted)}
          >
            {label}
          </div>
        ))}
        {grid.weeks.flatMap((week, w) =>
          week.map((dateKey, d) => {
            if (!dateKey) {
              return <div key={`${w}-${d}`} />;
            }
            const cell = resolveCell(
              cycles,
              dayRecords,
              results,
              forecast,
              dateKey,
              today,
              projected,
            );
            return (
              <DayCell
                key={dateKey}
                dateKey={dateKey}
                dayNumber={Number(dateKey.slice(8))}
                info={interpreted ? cell.info : null}
                forecast={interpreted ? cell.forecast : false}
                menses={cell.menses}
                cycleStart={cell.cycleStart}
                monitor={cell.monitor}
                intercourse={cell.intercourse}
                isToday={dateKey === today}
                detailMode={detailMode}
                hiddenLayers={hiddenLayers}
                onSelect={onSelectDate}
              />
            );
          }),
        )}
      </div>

      <Legend
        interpreted={interpreted}
        detailMode={detailMode}
        hidden={hiddenLayers}
        onToggleDetail={() =>
          updateSettings({ calendarDetailMode: detailMode === "simple" ? "full" : "simple" })
        }
        onToggleLayer={(id) =>
          updateSettings({ hiddenCalendarLayers: toggleLayer(hiddenLayers, id) })
        }
        onShowAll={() =>
          updateSettings({ hiddenCalendarLayers: hiddenOutsideOffered(hiddenLayers, offered) })
        }
      />

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected === today ? "Day details" : selected}</DialogTitle>
                {selectedCycle ? (
                  <DialogDescription>
                    Cycle day {selectedDay} of the cycle starting {selectedCycle.day1}.
                  </DialogDescription>
                ) : (
                  <DialogDescription>
                    Day {pending?.day ?? 1} of a cycle starting {pending?.day1 ?? selected}. Saving
                    re-derives cycle structure from your logged days.
                  </DialogDescription>
                )}
              </DialogHeader>
              <QuickEntry
                key={`${selectedCycle?.id ?? "planned"}:${selected}`}
                cycleId={selectedCycle?.id ?? ""}
                date={selected}
                dayInCycle={selectedDay}
                existing={selectedRecord}
                onSaved={() => setSelected(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Read-only preview of where a date would land if saved now, assuming no menses
 * until the user picks a flow. Nothing is written until the form is saved.
 */
function pendingPlacement(
  cycles: CycleEntity[],
  dayRecords: DayRecordEntity[],
  date: string,
): { day1: string; day: number } | null {
  const plans = planCycles(
    [
      ...dayRecords.map((r) => ({ date: r.date, menses: isMensesFlow(r.bloodFlow) })),
      { date, menses: false },
    ],
    cycles.filter((c) => c.pinned).map((c) => c.day1),
  );
  for (const plan of plans) {
    if (plan.dates.includes(date)) {
      return { day1: plan.day1, day: dayInCycle(plan.day1, date) };
    }
  }
  return null;
}

function Legend({
  interpreted,
  detailMode,
  hidden,
  onToggleDetail,
  onToggleLayer,
  onShowAll,
}: {
  interpreted: boolean;
  detailMode: "simple" | "full";
  hidden: readonly CalendarLayerId[];
  onToggleDetail(): void;
  onToggleLayer(id: CalendarLayerId): void;
  onShowAll(): void;
}) {
  const fullDetail = detailMode === "full";
  const offered = offeredLayers({ interpreted, detailMode });
  // A control only changes what it can show you: the reset is scoped to the keys
  // actually on screen, so an absent key's stored choice survives untouched.
  const canRestore = hasHiddenOnScreen(hidden, offered);
  const rows = LAYER_GROUPS.map((group) => ({
    group,
    layers: offered.filter((layer) => layer.group === group),
  })).filter((row) => row.layers.length > 0);

  return (
    <div className="space-y-2" data-testid="calendar-legend">
      <div className="flex justify-end gap-1">
        {canRestore && (
          <Button variant="ghost" size="sm" onClick={onShowAll} aria-label="Show all layers">
            Show all
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDetail}
          aria-label={fullDetail ? "Show simple view" : "Show full detail"}
        >
          {fullDetail ? "Simple view" : "Full detail"}
        </Button>
      </div>
      <div className={cn("space-y-1 text-[11px]", FERTILITY_TEXT_VISUALS.muted)}>
        {rows.map(({ group, layers }) => (
          <div key={group} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{LAYER_GROUP_LABELS[group]}</span>
            {layers.map((layer) => (
              <LayerKey
                key={layer.id}
                layer={layer}
                shown={isLayerShown(hidden, layer.id)}
                onToggle={() => onToggleLayer(layer.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One legend key per layer, doubling as that layer's visibility control. A hidden
 * key keeps its label and shows the shape without the colour, so it stays
 * readable — reading it is the only route to putting the layer back.
 */
function LayerKey({
  layer,
  shown,
  onToggle,
}: {
  layer: CalendarLayer;
  shown: boolean;
  onToggle(): void;
}) {
  return (
    <button
      type="button"
      aria-pressed={shown}
      aria-label={layer.label}
      onClick={onToggle}
      data-legend-label={layer.label}
      className="-my-1 flex items-center gap-1 rounded px-1 py-1 text-left transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className={cn(layer.footprint, shown ? swatchSample(layer) : HOLLOW_SWATCH)}
      >
        {shown && layer.glyph === "intercourse" ? (
          <Heart className={cn("size-2", LAYER_PAINT[layer.id].marker)} />
        ) : null}
      </span>
      {layer.label}
    </button>
  );
}
