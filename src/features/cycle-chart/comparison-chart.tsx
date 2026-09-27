import { useState } from "react";
import { Bar, ComposedChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { ReactElement } from "react";
import { CYCLE_COLORS, maxSpanOf, MONITOR_OPACITIES, type StripModel } from "./lib";

/** Half-band pad keeps the first/last segments fully inside the plot area. */
const X_PAD = 0.5;
const ROW_H = 36;
const LABEL_W = 80;

interface CycleComparisonChartProps {
  models: StripModel[];
}

/** Structural supertype of Recharts' BarShapeProps — only the fields we render. */
interface BandShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: unknown;
  color?: string;
}

function RowBandShape({ x, y, width, height, payload, color }: BandShapeProps): ReactElement {
  const datum = payload as { monitor?: StripModel["days"][number]["monitor"] } | null;
  const monitor = datum?.monitor ?? "none";
  const opacity = MONITOR_OPACITIES[monitor] ?? MONITOR_OPACITIES.none;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={2}
      fill={color ?? "#94a3b8"}
      fillOpacity={opacity}
      data-testid="comparison-day-band"
      data-monitor={monitor}
    />
  );
}

export function CycleComparisonChart({ models }: CycleComparisonChartProps): ReactElement {
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
      {visibleModels.map((model) => {
        const color = CYCLE_COLORS[models.indexOf(model) % CYCLE_COLORS.length];
        const data = model.days.map((d) => ({ day: d.day, value: 1, monitor: d.monitor }));
        return (
          <div key={model.cycleId} className="flex items-center gap-2">
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
              onClick={() => toggleCycle(model.cycleId)}
              data-testid="comparison-legend-item"
              data-cycle-id={model.cycleId}
              data-disabled={false}
              title="Click to hide this cycle"
            >
              <span className="h-2 w-2 rounded" style={{ backgroundColor: color }} />
              <span>
                C{model.cycleNo} ({model.span}d)
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <ResponsiveContainer width="100%" height={ROW_H}>
                <ComposedChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                  <XAxis
                    type="number"
                    dataKey="day"
                    domain={[X_PAD, maxSpan + X_PAD]}
                    ticks={[]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide domain={[0, 1]} />
                  {model.window && (
                    <ReferenceArea
                      x1={model.window.begin - X_PAD}
                      x2={(model.window.end ?? maxSpan) + X_PAD}
                      y1={0}
                      y2={1}
                      fill={color}
                      fillOpacity={0.18}
                      stroke={color}
                      strokeOpacity={0.35}
                      strokeWidth={1}
                      data-testid="comparison-window-band"
                      data-cycle-id={model.cycleId}
                      data-begin={model.window.begin}
                      data-end={model.window.end ?? ""}
                    />
                  )}
                  <Bar
                    dataKey="value"
                    isAnimationActive={false}
                    shape={(props: BandShapeProps) => <RowBandShape {...props} color={color} />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-1">
        <div className="shrink-0" style={{ width: `${LABEL_W}px` }} />
        <div className="flex-1">
          <XAxis
            type="number"
            dataKey="day"
            domain={[X_PAD, maxSpan + X_PAD]}
            ticks={Array.from({ length: maxSpan }, (_, i) => i + 1)}
            interval={0}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
          />
        </div>
      </div>
      <ComparisonLegend
        models={models}
        disabledCycleIds={disabledCycleIds}
        onToggle={toggleCycle}
      />
    </div>
  );
}

function ComparisonLegend({
  models,
  disabledCycleIds,
  onToggle,
}: {
  models: StripModel[];
  disabledCycleIds: Set<string>;
  onToggle: (cycleId: string) => void;
}): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
      {models.map((model, i) => {
        const color = CYCLE_COLORS[i % CYCLE_COLORS.length];
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
