import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { calendarPhaseForStatus, FERTILITY_CALENDAR_PHASE_VISUALS } from "@/lib/fertility-visuals";
import type { DayStatus } from "@/core/engine/types";
import type { CalendarLayerId, CalendarDetailMode, DayRecordEntity } from "@/core/store/entities";
import { isLayerShown, LAYER_PAINT, PROJECTED_CYCLE_START_LAYER } from "./layers";
import type { WindowEdges } from "./grid";
import { NO_WINDOW_EDGES } from "./grid";

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
  /**
   * The window's edges for this day, computed by the Calendar from the whole month. A cell cannot
   * decide these alone: it does not know whether the day above or beside it is inside the window.
   */
  windowEdges?: WindowEdges;
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
  windowEdges = NO_WINDOW_EDGES,
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
  const phaseShown = phase !== null && shown(phase);
  const phaseFill = phaseShown ? LAYER_PAINT[phase!].fill : undefined;
  // The window is a solid bar spanning the whole cell, not a strip on its top edge. A strip and the
  // menses stripe are both horizontal lines at opposite cell edges and read as one mark across a week
  // boundary, and a strip on every day of a month is a lot of horizontal lines to read past. Only a
  // fertile day is part of a run, so another phase is never given the bar.
  const windowBar = phaseShown && phase === "fertile" ? LAYER_PAINT.fertile.bar : undefined;
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

  // The window's two true ends are its only rounded ends. A row that opens or closes mid-window keeps
  // a square edge there, which is what makes the window's ends legible as the window's ends rather than
  // as whichever rows happen to fall inside it.
  const roundStart = windowEdges.roundStart;
  const roundEnd = windowEdges.roundEnd;

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
        // No `overflow-hidden`: the bar bleeds into the grid gap so a run of window days reads as one
        // shape, and clipping the cell would cut it into separate marks.
        "relative flex h-12 flex-col items-center justify-center rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:outline-none",
        statusFill,
        statusCue,
        isToday && "ring-2 ring-foreground/70",
        "hover:brightness-105 cursor-pointer",
      )}
    >
      {windowBar && (
        <span
          data-testid="calendar-window-bar"
          aria-hidden="true"
          className={cn(
            // A solid bar, full cell height, carrying its own colour. The fill is the shape: an outline
            // around it would be redundant, and on a 48px cell a 2px wire reads as a box rather than a
            // bar. This is the model Google Calendar and FullCalendar use for a multi-day span.
            "pointer-events-none absolute top-0 bottom-0",
            windowBar,
            // The bar bleeds 4px sideways into the grid gap, and only sideways. Left and right are
            // decided independently, because they are independent facts: a day can open its row and
            // still have the run continuing to its right, and a day can close its row and still have it
            // continuing to its left. Deciding both sides at once put a 4px tab of window colour outside
            // the calendar's first and last columns, and left a 4px gap inside the run immediately after
            // the day it opened on.
            windowEdges.start ? "left-0" : "-left-1",
            windowEdges.end ? "right-0" : "-right-1",
            // It never bleeds vertically. The row gap is what makes the calendar's weeks legible, and a
            // run that filled it would dissolve the row structure inside the window -- losing the one
            // cue that tells you which week you are looking at. A run that wraps weeks is therefore two
            // bars, one per row, and the gap between them is the calendar's own.
            roundStart && "rounded-l-2xl",
            roundEnd && "rounded-r-2xl",
          )}
        />
      )}
      <span className={cn("relative text-[11px] leading-none", isToday && "font-bold")}>
        {dayNumber}
      </span>
      {monitorShown && (
        <span
          data-testid="calendar-monitor-marker"
          title={`Monitor: ${monitor}`}
          // `relative` so the marker paints above the band rather than under it. The band sits at the
          // top edge and the marker mid-tile, so they do not overlap, but the ordering is stated
          // because a marker hidden behind a band would be a silent legibility loss.
          className={cn("relative mt-1 size-2.5 rounded-full", LAYER_PAINT[monitor!].marker)}
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
