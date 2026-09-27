import { useState } from "react";
import {
  Bar,
  ComposedChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactElement } from "react";
import {
  buildComparisonData,
  computeWindowOverlaps,
  CYCLE_COLORS,
  maxSpanOf,
  MONITOR_OPACITIES,
  type ComparisonDayDatum,
  type StripModel,
} from "./lib";

/** Half-band pad keeps the first/last segments fully inside the plot area. */
const X_PAD = 0.5;
/** Nominal pixel width of one cycle day; wide enough to read day numbers. */
const DAY_W = 28;
const CHART_H = 240;

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
}

/** Structural supertype of Recharts' TooltipProps — only the fields we render. */
interface ComparisonTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: unknown }>;
  models: StripModel[];
}

function ComparisonBandShape({ x, y, width, height, payload }: BandShapeProps): ReactElement {
  const datum = payload as ComparisonDayDatum | null;
  if (!datum) {
    return <g />;
  }
  return (
    <>
      {datum.bands.map((band) => {
        const color = CYCLE_COLORS[band.cycleIndex % CYCLE_COLORS.length];
        const opacity = MONITOR_OPACITIES[band.monitor ?? "none"] ?? MONITOR_OPACITIES.none;
        return (
          <rect
            key={band.cycleId}
            x={x}
            y={y}
            width={width}
            height={height}
            rx={2}
            fill={color}
            fillOpacity={opacity}
            data-testid="comparison-day-band"
            data-day={datum.day}
            data-cycle-id={band.cycleId}
            data-monitor={band.monitor ?? ""}
          />
        );
      })}
    </>
  );
}

function ComparisonTooltip({
  active,
  payload,
  models,
}: ComparisonTooltipProps): ReactElement | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const datum = payload[0]?.payload as ComparisonDayDatum | null;
  if (!datum) {
    return null;
  }
  return (
    <div className="rounded border bg-background p-2 text-xs shadow">
      <p className="mb-1 font-medium">Day {datum.day}</p>
      {datum.bands.map((band) => {
        const model = models[band.cycleIndex];
        return (
          <p key={band.cycleId} className="text-muted-foreground">
            Cycle {model.cycleNo} ({model.span} days) — {band.monitor ?? "no reading"}
          </p>
        );
      })}
    </div>
  );
}

export function CycleComparisonChart({ models }: CycleComparisonChartProps): ReactElement {
  const [disabledCycleIds, setDisabledCycleIds] = useState<Set<string>>(new Set());
  const visibleModels = models.filter((m) => !disabledCycleIds.has(m.cycleId));
  const data = buildComparisonData(visibleModels);
  const maxSpan = maxSpanOf(visibleModels);
  const xMax = maxSpan + X_PAD;

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

  const windows = visibleModels
    .map((m) => m.window)
    .filter((w): w is NonNullable<typeof w> => w !== null);
  const overlaps = computeWindowOverlaps(windows);

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
    <div className="space-y-2">
      <div className="overflow-x-auto" data-testid="cycle-comparison-chart">
        <div style={{ minWidth: `${maxSpan * DAY_W}px` }}>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <ComposedChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
              <XAxis
                type="number"
                dataKey="day"
                domain={[X_PAD, xMax]}
                ticks={Array.from({ length: maxSpan }, (_, i) => i + 1)}
                interval={0}
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis hide domain={[0, 2]} />
              {overlaps.map((overlap, i) => (
                <ReferenceArea
                  key={`overlap-${i}`}
                  x1={overlap.begin - X_PAD}
                  x2={overlap.end + X_PAD}
                  y1={0}
                  y2={2}
                  fill="#1e293b"
                  fillOpacity={0.3}
                  stroke="#1e293b"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  ifOverflow="extendDomain"
                  data-testid="comparison-window-overlap"
                  data-begin={overlap.begin}
                  data-end={overlap.end}
                />
              ))}
              {visibleModels.map((model) => {
                if (!model.window) {
                  return null;
                }
                const color = CYCLE_COLORS[models.indexOf(model) % CYCLE_COLORS.length];
                return (
                  <ReferenceArea
                    key={model.cycleId}
                    x1={model.window.begin - X_PAD}
                    x2={(model.window.end ?? maxSpan) + X_PAD}
                    y1={0}
                    y2={2}
                    fill={color}
                    fillOpacity={0.08}
                    stroke={color}
                    strokeOpacity={0.2}
                    strokeWidth={1}
                    ifOverflow="extendDomain"
                    data-testid="comparison-window-band"
                    data-cycle-id={model.cycleId}
                    data-begin={model.window.begin}
                    data-end={model.window.end ?? ""}
                  />
                );
              })}
              <Bar dataKey="value" isAnimationActive={false} shape={ComparisonBandShape} />
              <Tooltip content={<ComparisonTooltip models={visibleModels} />} />
            </ComposedChart>
          </ResponsiveContainer>
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
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
            data-testid="comparison-legend-item"
            data-cycle-id={model.cycleId}
            data-disabled={disabled}
            title={disabled ? "Click to show this cycle" : "Click to hide this cycle"}
          >
            <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: color }} />
            Cycle {model.cycleNo} ({model.span} days)
          </button>
        );
      })}
    </div>
  );
}
