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
  // The band is what tells one phase from another, so it is painted independently of the fill and
  // follows the same layer. A hidden phase layer suppresses both and nothing else. The fertile phase
  // has no band: the window is drawn as a region, and a band on top of it would put a horizontal line
  // back along the cell's top edge, which is the mark the region exists to replace.
  const phaseBand = phaseShown ? LAYER_PAINT[phase!].band : undefined;
  // The fertile window is a full-height block rather than a band, because a band and the menses stripe
  // are both horizontal lines at opposite cell edges and read as one mark across a week boundary.
  // Only a fertile day is part of a run, so a non-fertile phase is never given the block even if the
  // edges were computed for it.
  const inWindow = phaseShown && phase === "fertile";
  const windowBlock = inWindow ? LAYER_PAINT.fertile.block : undefined;
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
        // No `overflow-hidden`: the band bleeds 4px into the grid gap on both sides so a run of
        // same-phase days reads as one region, and clipping the cell would cut it into separate marks.
        "relative flex h-12 flex-col items-center justify-center rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:outline-none",
        statusFill,
        statusCue,
        isToday && "ring-2 ring-foreground/70",
        "hover:brightness-105 cursor-pointer",
      )}
    >
      {windowBlock && (
        <span
          data-testid="calendar-window-block"
          aria-hidden="true"
          className={cn(
            // A 2px outline at full cell height, 4px wider on each side so it bridges the grid gap and
            // the outline of a run reads as one unbroken line rather than a row of boxes.
            "pointer-events-none absolute -left-1 -right-1 border-2 border-transparent",
            // The block reaches into the row gap only where the run actually carries on down that
            // column, and stops flush with the cell edge where it does not. The vertical edges
            // therefore run unbroken through a run that spans weeks, and a run that ends mid-row ends
            // cleanly instead of bleeding over a day that is not part of it.
            windowEdges.continuesUp ? "-top-1" : "top-0",
            windowEdges.continuesDown ? "-bottom-1" : "bottom-0",
            // Each side is coloured in its own right, and only where the window has that edge. This is
            // the load-bearing part: a single `border-<colour>` class paints all four sides at once,
            // and a side's width cannot undo that, so the block would outline itself through the middle
            // of every run that wraps weeks and square off its own rounded ends.
            !windowEdges.continuesUp && windowBlock.top,
            windowEdges.end && windowBlock.right,
            !windowEdges.continuesDown && windowBlock.bottom,
            windowEdges.start && windowBlock.left,
            // Rounding is applied at the window's two true ends and nowhere else, so a run's first and
            // last day are single shapes rather than a rounded corner on an otherwise square edge. A
            // row that begins mid-window stays square, which is what makes the run's ends legible as
            // its ends.
            windowEdges.roundStart && "rounded-l-2xl",
            windowEdges.roundEnd && "rounded-r-2xl",
          )}
        />
      )}
      {phaseBand && (
        <span
          data-testid="calendar-phase-band"
          aria-hidden="true"
          className={cn(
            // A full-bleed strip 4px wider than the cell on each side, so the band bridges the grid
            // gap. The square ends deliberately overhang the cell's rounded corners: the band is a
            // stroke across the top of the calendar, not a fill clipped to the tile.
            "absolute inset-x-[-4px] top-0 h-1",
            phaseBand,
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
