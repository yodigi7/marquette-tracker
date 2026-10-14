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
  /**
   * The window runs on to the left in this row, but that day was recorded and this one is predicted.
   * The run's dashes begin here, so the day the app starts guessing is visible rather than implied.
   */
  beginsForecast?: boolean;
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
  beginsForecast = false,
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

  // A predicted day is only named when it carries a prediction worth hearing. The one recurring trap
  // is a month of equally blank predicted days, which would bury the few that matter, so a day with
  // no fertility claim attached to it says nothing extra at all.
  const forecastType = cycleStart
    ? "predicted period start"
    : forecast && phase === "fertile"
      ? "predicted fertile window day"
      : null;

  const accessibleParts = [
    dateKey,
    phaseLabel ?? "no status",
    monitorText,
    menses ? "menses" : null,
    detailMode === "full" && intercourse ? "intercourse" : null,
    forecastType,
  ].filter((part): part is string => !!part);

  // The phase fill is kept when one is known, so a predicted fertile day still
  // reads as fertile; the dashes are what say "this day has not happened yet".
  // The forecast fill is the fallback for a day with no phase shown.
  const marked = forecast && predictedShown;
  const statusFill = phaseFill ?? (marked ? LAYER_PAINT.predicted.fill : undefined);
  // A predicted day is marked by dashes either way. When it draws a window bar the dashes go OUTSIDE
  // that bar, as a run outline. With no bar — a day outside the window, or a window day whose fertile
  // layer the user has hidden — it keeps the plain dashed border on the cell, because a Predicted day
  // is the one layer that carries a border as well as a fill, and that is what separates it from a
  // plain phase cell without colour. The question is therefore "is a bar being drawn", not "is the
  // phase fertile": those differ on a window day with the fertile layer hidden, and reading the phase
  // left that day with a forecast fill and no cue at all.
  //
  // A border is drawn inside the day box and shrinks the padding box with it, and the window bar is
  // positioned against the padding box. So a border and a bar on the same day cannot coexist: the bar
  // came out 2px short and 2px narrow, with the border crossing its bottom edge.
  const statusCue = marked && !windowBar ? LAYER_PAINT.predicted.border : undefined;

  // The window's two true ends are its only rounded ends. A row that opens or closes mid-window keeps
  // a square edge there, which is what makes the window's ends legible as the window's ends rather than
  // as whichever rows happen to fall inside it. Both the bar and the outline read these straight off
  // `windowEdges`, so they cannot disagree about which days those are.

  // Where the run's dashes begin on the left. A day the window genuinely started on gets a line 2px
  // outside the bar's own start. A day the window merely ran into gets no line, so its offset only has
  // to clear the bar. The first PREDICTED day of a run is the third case: today's ring reaches 2px into
  // the grid gap on this side, so a line 2px outside the bar would be drawn across the recorded day
  // beside it, hard against the ring. It starts at the day boundary instead, which leaves 2px of window
  // colour between the two marks and keeps both fully legible.
  const outlineLeft = beginsForecast
    ? "-left-0"
    : windowEdges.start
      ? "-left-[2px]"
      : "-left-[6px]";

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
        // Lifted so nothing later in the calendar paints over today. An outset ring cannot be protected
        // by document order alone: the next day's cell is later in the DOM, and its bar reaches back
        // across the grid gap, straight over this cell's right-hand ring stroke.
        isToday && "z-10",
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
            //
            // The rounded ends take the CELL's radius, not a larger one of their own. The cell's own
            // background sits behind the bar, and a sharper corner on the cell than on the bar fills
            // the space the bar curves away from — reaching further out than the bar and poking past
            // whatever is drawn beyond it. Matching the cell keeps the two arcs concentric.
            windowEdges.roundStart && "rounded-l-md",
            windowEdges.roundEnd && "rounded-r-md",
          )}
        />
      )}
      {/* A predicted day inside the window is marked by dashes drawn OUTSIDE the bar, never by a
          border on the cell. The outline is offset from the BAR's box rather than the cell's, because
          the bar bleeds 4px into the grid gap wherever the run continues — measured from the cell the
          dashes fell short of the bar and the two corner arcs were measured from different origins.
          A side whose neighbour is in the same horizontal run gets no line at all, which is what keeps
          the interior of the run free of dividers.
          Top and bottom are drawn on every day, including one whose run carries on into the row above
          or below: a window does continue vertically across a week boundary. Those edges are still
          outer ones for this bar, because the bar never bleeds vertically — each row's segment is its
          own shape, and the dashes trace that shape rather than the window as a whole. */}
      {windowBar && marked && (
        <span
          data-testid="calendar-run-outline"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute border-dashed border-fertility-forecast-border",
            "-top-[2px] -bottom-[2px] border-t border-b",
            outlineLeft,
            windowEdges.end ? "-right-[2px] border-r" : "-right-[6px]",
            (windowEdges.start || beginsForecast) && "border-l",
            windowEdges.roundStart && "rounded-l-[10px]",
            windowEdges.roundEnd && "rounded-r-[10px]",
          )}
        />
      )}

      {/* Today is marked by a ring drawn AFTER the bar, never by a `ring-2` box-shadow on the cell.
          A box-shadow paints under every child, and the bar bleeds past the cell on both sides, so on a
          day inside the window the bar covered the ring's left and right strokes outright — today showed
          as two arcs rather than a ring. Drawing the ring here puts it on top of the bar instead, and
          the cell's `z-10` keeps the NEXT day's bar from painting over it, since that cell comes later
          in the DOM and reaches back across the gap. Same 2px outset, same radius as the cell: on a day
          with no bar the two are indistinguishable. */}
      {isToday && (
        <span
          data-testid="calendar-today-ring"
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[2px] rounded-[10px] border-2 border-foreground/70"
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
