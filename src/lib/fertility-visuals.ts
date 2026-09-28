import type { DayStatus, MonitorReading } from "@/core/engine/types";

export type CalendarPhase = "before" | "fertile" | "after";

export interface FertilityStatusVisual {
  fill: string;
  foreground: string;
  border: string;
  /**
   * The thin full-width strip a Calendar day carries along its top edge, in the status's full-chroma
   * colour. The band, not the fill, is what tells one status from another: a monitor marker is painted
   * on the fill, which caps how light the fill may be, so fills cannot separate far enough to carry the
   * distinction. The band has no marker on it and is free of that cap.
   */
  band: string;
  badge: string;
}

export interface CalendarPhaseVisual {
  label: string;
  fill: string;
  band: string;
  /**
   * The solid bar the Calendar draws the fertile window with, spanning the whole day. The bar carries
   * its own colour rather than reusing the cell's tint, because it is the mark a run of window days is
   * recognised by, and a mark that spans the whole cell is the one thing that may be brighter than the
   * cell behind it -- up to the limit the reading markers painted on it allow. The cell's `fill` stays
   * the darker tint, which is what the Status view and any surface without a bar keep using.
   */
  bar: string;
}

export interface FertilityMonitorVisual {
  dot: string;
  fill: string;
}

export interface FertilityMarkerVisual {
  dot?: string;
  stripe?: string;
  asterisk?: string;
  icon?: string;
}

export interface FertilityForecastVisual {
  fill: string;
  cellBorder: string;
  text: string;
  /** CSS custom properties used by the Recharts reference area. */
  windowFill: string;
  windowBorder: string;
}

/**
 * Theme-neutral class names for fertility presentation. The corresponding
 * light/dark values live in `src/index.css`, so callers do not branch on theme.
 */
export const FERTILITY_STATUS_VISUALS: Record<DayStatus, FertilityStatusVisual> = {
  "pre-fertile": {
    fill: "bg-fertility-status-pre",
    foreground: "text-fertility-status-pre-fg",
    border: "border-fertility-status-pre-border",
    band: "bg-fertility-status-pre-band",
    badge: "bg-fertility-status-pre text-fertility-status-pre-fg",
  },
  fertile: {
    fill: "bg-fertility-status-fertile",
    foreground: "text-fertility-status-fertile-fg",
    border: "border-fertility-status-fertile-border",
    band: "bg-fertility-status-fertile-band",
    badge: "bg-fertility-status-fertile text-fertility-status-fertile-fg",
  },
  "post-peak": {
    fill: "bg-fertility-status-post-peak",
    foreground: "text-fertility-status-post-peak-fg",
    border: "border-fertility-status-post-peak-border",
    band: "bg-fertility-status-post-peak-band",
    badge: "bg-fertility-status-post-peak text-fertility-status-post-peak-fg",
  },
  "post-calendar": {
    fill: "bg-fertility-status-post-calendar",
    foreground: "text-fertility-status-post-calendar-fg",
    border: "border-fertility-status-post-calendar-border",
    band: "bg-fertility-status-post-calendar-band",
    badge: "bg-fertility-status-post-calendar text-fertility-status-post-calendar-fg",
  },
};

/**
 * Calendar-only phase treatment; the engine's precise statuses remain unchanged.
 * Each phase deliberately reuses the existing status treatments so the collapsed
 * view can never drift from the palette the other surfaces use.
 */
export const FERTILITY_CALENDAR_PHASE_VISUALS: Record<CalendarPhase, CalendarPhaseVisual> = {
  before: {
    label: "Before",
    fill: FERTILITY_STATUS_VISUALS["pre-fertile"].fill,
    band: FERTILITY_STATUS_VISUALS["pre-fertile"].band,
    // Before and After keep their band and get no bar. The window is the one thing on the calendar
    // the user scans for, and a bar on every phase would put three in competition for that attention.
    bar: "",
  },
  fertile: {
    label: "Fertile",
    fill: FERTILITY_STATUS_VISUALS.fertile.fill,
    // No band. A band is a horizontal line along the cell's top edge, and the menses stripe is a
    // horizontal line along the bottom edge of the day above; across a week boundary the two sit 8px
    // apart and read as one mark. The window is a bar instead, which cannot be confused with a stripe.
    band: "",
    bar: "bg-fertility-status-fertile-bar",
  },
  after: {
    label: "After",
    fill: FERTILITY_STATUS_VISUALS["post-peak"].fill,
    band: FERTILITY_STATUS_VISUALS["post-peak"].band,
    bar: "",
  },
};

export function calendarPhaseForStatus(status: DayStatus): CalendarPhase {
  if (status === "pre-fertile") {
    return "before";
  }
  return status === "fertile" ? "fertile" : "after";
}

export function calendarPhaseLabel(phase: CalendarPhase): string {
  return FERTILITY_CALENDAR_PHASE_VISUALS[phase].label;
}

/** Shared badge treatment for a status. */
export function fertilityStatusBadge(status: DayStatus): string {
  return FERTILITY_STATUS_VISUALS[status].badge;
}

export const FERTILITY_MONITOR_VISUALS: Record<MonitorReading, FertilityMonitorVisual> = {
  none: { dot: "bg-fertility-monitor-none", fill: "fill-fertility-monitor-none" },
  low: { dot: "bg-fertility-monitor-low", fill: "fill-fertility-monitor-low" },
  high: { dot: "bg-fertility-monitor-high", fill: "fill-fertility-monitor-high" },
  peak: { dot: "bg-fertility-monitor-peak", fill: "fill-fertility-monitor-peak" },
};

export const FERTILITY_MARKER_VISUALS = {
  menses: {
    dot: "bg-fertility-marker-menses",
    stripe: "bg-fertility-marker-menses",
  },
  intercourse: { icon: "fill-fertility-marker-intercourse text-fertility-marker-intercourse" },
} as const;

export const FERTILITY_FORECAST_VISUAL: FertilityForecastVisual = {
  fill: "bg-fertility-forecast-bg",
  cellBorder: "border-dashed border-fertility-forecast-border",
  text: "text-fertility-forecast-fg",
  windowFill: "var(--fertility-window-fill)",
  windowBorder: "var(--fertility-window-border)",
};

export const FERTILITY_TEXT_VISUALS = {
  muted: "text-fertility-muted",
  body: "text-fertility-body",
  warning: "text-fertility-warning",
} as const;
