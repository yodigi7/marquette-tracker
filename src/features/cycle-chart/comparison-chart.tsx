import { useState } from "react";
import { Bar, ComposedChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { ReactElement } from "react";
import { colorForCycle, maxSpanOf, MONITOR_OPACITIES, type StripModel } from "./lib";

/** Half-band pad keeps the first/last segments fully inside the plot area. */
const X_PAD = 0.5;
/** Band height inside each row. Identical for every row so days line up. */
const PLOT_H = 30;
/** Top breathing room inside each row's chart. */
const PAD_TOP = 2;
/** Height reserved for the shared day axis, drawn once under the last row. */
const AXIS_H = 16;
const LABEL_W = 90;

/**
 * Monitor level as a fraction of the row height. Height is the primary channel for
 * the reading, so the chart stays readable without relying on colour perception;
 * opacity is only a redundant second cue. An unlogged day keeps a thin empty track
 * so "no reading" is visibly different from "a short reading".
 */
const MONITOR_LEVEL_HEIGHTS: Record<string, number> = {
  none: 0.14,
  low: 0.4,
  high: 0.72,
  peak: 1,
};

/** Keeps the empty track visible even in a very short row. */
const MIN_BAND_PX = 2;

interface CycleComparisonChartProps {
  models: StripModel[];
  /**
   * A cycle's colour, keyed by cycle id, resolved against **all** logged cycles
   * rather than the models passed in. That is what stops a cycle's colour from
   * changing when the user hides a cycle, resizes the set, or hand-picks one.
   */
  colorByCycleId: ReadonlyMap<string, string>;
}

/** Structural supertype of Recharts' BarShapeProps — only the fields we render. */
interface BandShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: unknown;
}

interface BandDatum {
  day: number;
  value: number;
  monitor?: StripModel["days"][number]["monitor"];
  color: string;
  cycleId: string;
}

function RowBandShape({ x, y, width, height, payload }: BandShapeProps): ReactElement {
  const datum = payload as BandDatum | null;
  const monitor = datum?.monitor ?? "none";
  const opacity = MONITOR_OPACITIES[monitor] ?? MONITOR_OPACITIES.none;
  const color = datum?.color;
  // Blocks are bottom-aligned so every reading rises from a shared baseline.
  const full = height ?? 0;
  const blockH = Math.max(MIN_BAND_PX, full * (MONITOR_LEVEL_HEIGHTS[monitor] ?? 0));
  const top = (y ?? 0) + (full - blockH);
  return (
    <rect
      x={x}
      y={top}
      width={width}
      height={blockH}
      rx={2}
      fill={color}
      fillOpacity={opacity}
      data-testid="comparison-day-band"
      data-day={datum?.day}
      data-monitor={monitor}
      data-color={color}
      data-cycle-id={datum?.cycleId}
    />
  );
}

export function CycleComparisonChart({
  models,
  colorByCycleId,
}: CycleComparisonChartProps): ReactElement {
  const [disabledCycleIds, setDisabledCycleIds] = useState<Set<string>>(new Set());
  const visibleModels = models.filter((m) => !disabledCycleIds.has(m.cycleId));
  const maxSpan = maxSpanOf(visibleModels);

  if (models.length === 0) {
    return (
      <div
        className="py-8 text-center text-sm text-muted-foreground"
        data-testid="comparison-empty"
      >
        No cycles to compare.
      </div>
    );
  }

  const toggleCycle = (cycleId: string) => {
    setDisabledCycleIds((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1" data-testid="cycle-comparison-chart">
      {visibleModels.map((model, cycleIdx) => {
        // One resolved colour, three consumers: this label swatch, the legend
        // entry below, and every band in this row. Nothing here re-derives it
        // from a position, so hiding a row cannot shift the others.
        const color = colorForCycle(colorByCycleId, model.cycleId);
        const isLast = cycleIdx === visibleModels.length - 1;
        const data: BandDatum[] = model.days.map((d) => ({
          day: d.day,
          value: 1,
          monitor: d.monitor,
          color,
          cycleId: model.cycleId,
        }));
        return (
          <div key={model.cycleId} className="flex items-center gap-2">
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
              style={{ width: `${LABEL_W}px` }}
              onClick={() => toggleCycle(model.cycleId)}
              data-testid="comparison-legend-item"
              data-cycle-id={model.cycleId}
              data-disabled="false"
              data-color={color}
              title="Click to hide this cycle"
            >
              <span className="h-2 w-2 rounded" style={{ backgroundColor: color }} />
              <span>
                Cycle {model.cycleNo} ({model.span}d)
              </span>
            </button>
            <div className="min-w-0 flex-1">
              {/* The axis is charged twice on the last row: once as bottom margin and
                  once as the axis's own height, so PLOT_H stays identical to the rows
                  above it and the day columns line up across every cycle. */}
              <ResponsiveContainer
                width="100%"
                height={isLast ? PLOT_H + PAD_TOP + AXIS_H * 2 : PLOT_H + PAD_TOP}
              >
                <ComposedChart
                  data={data}
                  margin={{ top: PAD_TOP, right: 0, left: 0, bottom: isLast ? AXIS_H : 0 }}
                >
                  {/* Day numbers appear once, under the bottom row; every row shares the
                      same domain so the day columns line up across cycles. */}
                  {isLast ? (
                    <XAxis
                      type="number"
                      dataKey="day"
                      domain={[X_PAD, maxSpan + X_PAD]}
                      ticks={Array.from({ length: maxSpan }, (_, i) => i + 1)}
                      interval={0}
                      height={AXIS_H}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9 }}
                    />
                  ) : (
                    <XAxis hide type="number" dataKey="day" domain={[X_PAD, maxSpan + X_PAD]} />
                  )}
                  <YAxis hide domain={[0, 1]} />
                  {model.window && (
                    <ReferenceArea
                      x1={model.window.begin - X_PAD}
                      x2={(model.window.end ?? maxSpan) + X_PAD}
                      y1={0}
                      y2={1}
                      fill="#64748b"
                      fillOpacity={0.14}
                      stroke="#64748b"
                      strokeOpacity={0.3}
                      strokeWidth={1}
                      data-testid="comparison-window-band"
                      data-cycle-id={model.cycleId}
                      data-begin={model.window.begin}
                      data-end={model.window.end ?? ""}
                    />
                  )}
                  <Bar dataKey="value" isAnimationActive={false} shape={RowBandShape} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
      <ComparisonLegend
        models={models}
        colorByCycleId={colorByCycleId}
        disabledCycleIds={disabledCycleIds}
        onToggle={toggleCycle}
      />
    </div>
  );
}

function ComparisonLegend({
  models,
  colorByCycleId,
  disabledCycleIds,
  onToggle,
}: {
  models: StripModel[];
  colorByCycleId: ReadonlyMap<string, string>;
  disabledCycleIds: Set<string>;
  onToggle: (cycleId: string) => void;
}): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
      {models.map((model) => {
        const color = colorForCycle(colorByCycleId, model.cycleId);
        const disabled = disabledCycleIds.has(model.cycleId);
        return (
          <button
            key={model.cycleId}
            type="button"
            className={`flex items-center gap-1 rounded px-1 py-0.5 transition-opacity ${
              disabled ? "opacity-30 line-through" : "opacity-100 hover:bg-muted"
            }`}
            onClick={() => onToggle(model.cycleId)}
            data-testid="comparison-legend-toggle"
            data-cycle-id={model.cycleId}
            data-disabled={disabled}
            data-color={color}
            title={disabled ? "Click to show this cycle" : "Click to hide this cycle"}
          >
            <span className="h-2 w-2 rounded" style={{ backgroundColor: color }} />
            Cycle {model.cycleNo} ({model.span}d)
          </button>
        );
      })}
    </div>
  );
}
