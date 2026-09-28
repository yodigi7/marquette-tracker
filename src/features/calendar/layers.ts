/**
 * The Calendar's visual layers, declared once.
 *
 * The legend renders its entries from this list, and the day cell both asks it
 * whether a layer is shown and takes its paint from it, so a key that cannot hide
 * anything, a treatment nothing explains, and a sample that disagrees with the
 * cell it describes cannot arise from the two drifting apart.
 */

import {
  FERTILITY_CALENDAR_PHASE_VISUALS,
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_MARKER_VISUALS,
  FERTILITY_MONITOR_VISUALS,
  NO_BLOCK_EDGES,
  type BlockEdges,
  type CalendarPhase,
} from "@/lib/fertility-visuals";
import { cn } from "@/lib/utils";
import type { CalendarDetailMode, CalendarLayerId } from "@/core/store/entities";

/** When a layer's key is offered in the legend. */
export type LayerAvailability = "always" | "algorithm" | "full-detail";

/** Legend row a layer's key sits in. */
export type LayerGroup = "status" | "data" | "detail";

export interface CalendarLayer {
  id: CalendarLayerId;
  label: string;
  group: LayerGroup;
  needs: LayerAvailability;
  /** Footprint of the legend swatch, whatever state it is in. */
  footprint: string;
  /** Set when the swatch draws a glyph; the legend owns the component. */
  glyph?: "intercourse";
}

/**
 * Every class the day cell paints for a layer. Declared here, once, so the cell
 * and the legend sample cannot drift apart: both read this record rather than
 * naming the palette themselves. Unused slots are empty, and `cn` drops them.
 */
export interface LayerPaint {
  /** Background of a layer that fills the day cell. */
  fill: string;
  /** Border of a layer that outlines the day cell. */
  border: string;
  /**
   * Colour of a layer drawn as the thin strip along the cell's top edge. Separate from `fill` because
   * the two carry different obligations: a marker is painted on the fill and caps its lightness, so only
   * the band is required to distinguish one layer from another.
   */
  band: string;
  /**
   * The four sides of a layer drawn as a full-height block. Separate from `border`, which outlines the
   * whole cell for the predictive treatment, because a block draws only the edges it actually has, and
   * each edge has to be coloured on its own to leave the others unpainted.
   */
  block: BlockEdges;
  /** Colour or icon class of a layer drawn as a marker inside the cell. */
  marker: string;
}

const NO_PAINT: LayerPaint = {
  fill: "",
  border: "",
  band: "",
  block: NO_BLOCK_EDGES,
  marker: "",
};

export const LAYER_PAINT: Record<CalendarLayerId, LayerPaint> = {
  before: {
    ...NO_PAINT,
    fill: FERTILITY_CALENDAR_PHASE_VISUALS.before.fill,
    band: FERTILITY_CALENDAR_PHASE_VISUALS.before.band,
  },
  fertile: {
    ...NO_PAINT,
    fill: FERTILITY_CALENDAR_PHASE_VISUALS.fertile.fill,
    band: FERTILITY_CALENDAR_PHASE_VISUALS.fertile.band,
    // Only the fertile phase is drawn as a block. The other two keep their band, so the window is the
    // only region on the calendar and the phases around it stay quiet.
    block: FERTILITY_CALENDAR_PHASE_VISUALS.fertile.block,
  },
  after: {
    ...NO_PAINT,
    fill: FERTILITY_CALENDAR_PHASE_VISUALS.after.fill,
    band: FERTILITY_CALENDAR_PHASE_VISUALS.after.band,
  },
  predicted: {
    ...NO_PAINT,
    fill: FERTILITY_FORECAST_VISUAL.fill,
    border: cn("border", FERTILITY_FORECAST_VISUAL.cellBorder),
  },
  menses: { ...NO_PAINT, marker: FERTILITY_MARKER_VISUALS.menses.stripe },
  low: { ...NO_PAINT, marker: FERTILITY_MONITOR_VISUALS.low.dot },
  high: { ...NO_PAINT, marker: FERTILITY_MONITOR_VISUALS.high.dot },
  peak: { ...NO_PAINT, marker: FERTILITY_MONITOR_VISUALS.peak.dot },
  intercourse: { ...NO_PAINT, marker: FERTILITY_MARKER_VISUALS.intercourse.icon },
};

/**
 * The classes a shown key's swatch carries, taken from the same paint record.
 *
 * A band or a block wins over the fill, so the key shows the mark the day cells actually use to tell
 * the phases apart. A sample built from the fill would describe a treatment the user cannot rely on,
 * because the fills are too close together to distinguish and only the band and the block are meant to
 * be. A block is sampled as an outlined region on the phase's own fill, because that is the shape the
 * day cell draws: a closed run, not a stroke.
 */
export function swatchSample(layer: CalendarLayer): string {
  const paint = LAYER_PAINT[layer.id];
  if (paint.band) return cn(paint.band, BAND_FOOTPRINT);
  if (paint.block.left) {
    return cn(paint.block.top, paint.block.right, paint.block.bottom, paint.block.left, paint.fill);
  }
  return paint.fill ? cn(paint.border, paint.fill) : paint.marker;
}

/** The stripe on a projected cycle's day 1 is a prediction, not a logged menses.
 * Routing it through a named layer is what keeps the `Menses` control from
 * silently removing a forecast cue. */
export const PROJECTED_CYCLE_START_LAYER: CalendarLayerId = "predicted";

export const LAYER_GROUPS: readonly LayerGroup[] = ["status", "data", "detail"];

export const LAYER_GROUP_LABELS: Record<LayerGroup, string> = {
  status: "Status",
  data: "Data",
  detail: "Details",
};

const SQUARE = "h-2.5 w-2.5 rounded";

/**
 * A phase key shows the shape its day cells draw. Before and After draw a band, so their key is a bar.
 * Fertile draws the window as a full-height region, so its key is a bordered box. The legend applies
 * the footprint itself, so `swatchSample` carries the colour and this records the shape on the layer as
 * well, so the two cannot disagree.
 */
const BAND_FOOTPRINT = "h-1 w-6 rounded-full";
const BLOCK_FOOTPRINT = "h-3 w-5 rounded-md border-2";

function phaseLayer(id: CalendarPhase, label: string): CalendarLayer {
  const footprint = LAYER_PAINT[id].block.left ? BLOCK_FOOTPRINT : BAND_FOOTPRINT;
  return { id, label, group: "status", needs: "algorithm", footprint };
}

function monitorLayer(id: "low" | "high" | "peak", label: string): CalendarLayer {
  return { id, label, group: "data", needs: "always", footprint: "h-1.5 w-1.5 rounded-full" };
}

/**
 * One key covers both the next-window forecast and projected cycle days: they
 * are the same treatment, so a second key would offer a distinction the shared
 * vocabulary deliberately refuses to make.
 */
const PREDICTED: CalendarLayer = {
  id: "predicted",
  label: "Predicted",
  group: "status",
  needs: "algorithm",
  footprint: SQUARE,
};

export const CALENDAR_LAYERS: readonly CalendarLayer[] = [
  phaseLayer("before", FERTILITY_CALENDAR_PHASE_VISUALS.before.label),
  phaseLayer("fertile", FERTILITY_CALENDAR_PHASE_VISUALS.fertile.label),
  phaseLayer("after", FERTILITY_CALENDAR_PHASE_VISUALS.after.label),
  PREDICTED,
  {
    id: "menses",
    label: "Menses",
    group: "data",
    needs: "always",
    footprint: "h-1 w-4 rounded-full",
  },
  monitorLayer("low", "Low"),
  monitorLayer("high", "High"),
  monitorLayer("peak", "Peak"),
  {
    id: "intercourse",
    label: "Intercourse",
    group: "detail",
    needs: "full-detail",
    footprint: "size-2.5 inline-flex items-center justify-center",
    glyph: "intercourse",
  },
];

export interface LayerAvailabilityOptions {
  interpreted: boolean;
  detailMode: CalendarDetailMode;
}

function isOffered(layer: CalendarLayer, options: LayerAvailabilityOptions): boolean {
  if (layer.needs === "algorithm") {
    return options.interpreted;
  }
  if (layer.needs === "full-detail") {
    return options.detailMode === "full";
  }
  return true;
}

/** The keys the legend offers right now, in declaration order. */
export function offeredLayers(options: LayerAvailabilityOptions): CalendarLayer[] {
  return CALENDAR_LAYERS.filter((layer) => isOffered(layer, options));
}

/** Whether a layer's visual is currently painted. */
export function isLayerShown(hidden: readonly CalendarLayerId[], id: CalendarLayerId): boolean {
  return !hidden.includes(id);
}

/**
 * The stored hidden ids that survive a restore of everything currently on
 * screen: the keys the legend is not offering, and therefore cannot act on.
 */
export function hiddenOutsideOffered(
  hidden: readonly CalendarLayerId[],
  offered: readonly CalendarLayer[],
): CalendarLayerId[] {
  const visibleIds = new Set(offered.map((layer) => layer.id));
  return hidden.filter((id) => !visibleIds.has(id));
}

/** Whether any key currently on screen is hidden, and so has something to restore. */
export function hasHiddenOnScreen(
  hidden: readonly CalendarLayerId[],
  offered: readonly CalendarLayer[],
): boolean {
  const visibleIds = new Set(offered.map((layer) => layer.id));
  return hidden.some((id) => visibleIds.has(id));
}

/** The next stored list after activating one layer's key. */
export function toggleLayer(
  hidden: readonly CalendarLayerId[],
  id: CalendarLayerId,
): CalendarLayerId[] {
  return isLayerShown(hidden, id) ? [...hidden, id] : hidden.filter((entry) => entry !== id);
}

/** The hollow treatment a hidden key's swatch takes: the shape, not the colour. */
export const HOLLOW_SWATCH = "border border-current bg-transparent";
