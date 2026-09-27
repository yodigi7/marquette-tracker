import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { calendarPhaseForStatus, FERTILITY_CALENDAR_PHASE_VISUALS } from "@/lib/fertility-visuals";
import type { DayStatus } from "@/core/engine/types";
import type { CalendarLayerId, CalendarDetailMode, DayRecordEntity } from "@/core/store/entities";
import { isLayerShown, LAYER_PAINT, PROJECTED_CYCLE_START_LAYER } from "./layers";

export interface DayCellProps {
  dateKey: string;
  dayNumber: number;
  info: DayStatus | null;
  forecast: boolean;
  /** Menses the user recorded, or a real cycle's day 1. */
  menses: boolean;
  /** The first day of a projected cycle: a prediction, not a logged observation. */
  cycleStart?: boolean;
  monitor: DayRecordEntity["monitor"];
  intercourse: boolean;
  isToday: boolean;
  detailMode?: CalendarDetailMode;
  /** Layers the user has hidden. Anything absent is painted. */
  hiddenLayers?: readonly CalendarLayerId[];
  onSelect(dateKey: string): void;
}

export function DayCell({
  dateKey,
  dayNumber,
  info,
  forecast,
  menses,
  cycleStart = false,
  monitor,
  intercourse,
  isToday,
  detailMode = "simple",
  hiddenLayers = [],
  onSelect,
}: DayCellProps) {
  // Hiding a layer suppresses its paint and nothing else. The accessible
  // description below is built from the same values whether or not the matching
  // visual is shown, because the text is the non-colour equivalent the hidden
  // treatment relied on.
  const shown = (id: CalendarLayerId) => isLayerShown(hiddenLayers, id);

  const phase = info ? calendarPhaseForStatus(info) : null;
  const phaseLabel = phase ? FERTILITY_CALENDAR_PHASE_VISUALS[phase].label : null;
  const phaseFill = phase && shown(phase) ? LAYER_PAINT[phase].fill : undefined;
  const predictedShown = shown("predicted");
  const hasMonitor = !!monitor && monitor !== "none";
  const monitorShown = hasMonitor && shown(monitor);
  const monitorText = hasMonitor ? `monitor ${monitor}` : null;
  // The stripe is shared, but each stripe has its own layer: a logged menses day
  // follows the menses layer, a predicted cycle start follows the predictive one.
  const showMenses =
    (menses && shown("menses")) || (cycleStart && shown(PROJECTED_CYCLE_START_LAYER));
  const showIntercourse = detailMode === "full" && intercourse && shown("intercourse");

  const accessibleParts = [
    dateKey,
    phaseLabel ?? "no status",
    monitorText,
    menses ? "menses" : null,
    detailMode === "full" && intercourse ? "intercourse" : null,
    forecast ? "projected" : null,
  ].filter((part): part is string => !!part);

  // The phase fill is kept when one is known, so a projected fertile day still
  // reads as fertile; the dashed border carries "this day has not happened yet".
  // The forecast fill is the fallback for a day with no phase shown.
  const statusFill =
    phaseFill ?? (forecast && predictedShown ? LAYER_PAINT.predicted.fill : undefined);
  const statusCue = forecast && predictedShown ? LAYER_PAINT.predicted.border : undefined;

  return (
    <button
      type="button"
      data-testid="day-cell"
      data-date={dateKey}
      data-status={info ?? ""}
      data-phase={phase ?? undefined}
      data-forecast={forecast || undefined}
      aria-label={accessibleParts.join(", ")}
      onClick={() => onSelect(dateKey)}
      className={cn(
        "relative flex h-12 flex-col items-center justify-center overflow-hidden rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:outline-none",
        statusFill,
        statusCue,
        isToday && "ring-2 ring-foreground/70",
        "hover:brightness-105 cursor-pointer",
      )}
    >
      <span className={cn("text-[11px] leading-none", isToday && "font-bold")}>{dayNumber}</span>
      {monitorShown && (
        <span
          data-testid="calendar-monitor-marker"
          title={`Monitor: ${monitor}`}
          className={cn("mt-1 size-2.5 rounded-full", LAYER_PAINT[monitor!].marker)}
        />
      )}
      {showMenses && (
        <span
          data-testid="calendar-menses-stripe"
          title="Menses"
          aria-hidden="true"
          className={cn("absolute inset-x-1 bottom-0 h-1 rounded-full", LAYER_PAINT.menses.marker)}
        />
      )}
      {showIntercourse && (
        <span className="mt-1 flex h-2.5 items-center gap-0.5">
          <span title="Intercourse" className="inline-flex">
            <Heart aria-hidden="true" className={cn("size-2", LAYER_PAINT.intercourse.marker)} />
          </span>
        </span>
      )}
    </button>
  );
}
