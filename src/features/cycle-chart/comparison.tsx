import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cycleResultsByCycleId } from "@/core/store/selectors";
import { useAppStore } from "@/core/store/useAppStore";
import { buildStripModel, cycleSpanOf, type StripModel } from "./lib";
import { CycleComparisonChart } from "./comparison-chart";

type SelectionMode = "recent" | "custom";

export function CycleComparisonView() {
  const cycles = useAppStore((s) => s.cycles);
  const dayRecords = useAppStore((s) => s.dayRecords);
  const settings = useAppStore((s) => s.settings);
  const output = useAppStore((s) => s.output);
  const [mode, setMode] = useState<SelectionMode>("recent");
  const [recentN, setRecentN] = useState(settings.historyWindow);
  const [customIds, setCustomIds] = useState<Set<string>>(new Set());

  const results = useMemo(() => cycleResultsByCycleId(output), [output]);

  // Build StripModel for each cycle (reuses the existing single-cycle logic)
  const modelsByCycleId = useMemo(() => {
    const map = new Map<string, StripModel>();
    for (const cycle of cycles) {
      const model = buildStripModel(
        cycle,
        results.get(cycle.id),
        dayRecords.filter((r) => r.cycleId === cycle.id),
        settings.algorithmEnabled,
      );
      map.set(cycle.id, model);
    }
    return map;
  }, [cycles, results, dayRecords, settings.algorithmEnabled]);

  // Select which cycles participate
  const selectedModels = useMemo(() => {
    const sorted = [...cycles].reverse(); // newest first
    if (mode === "recent") {
      const n = Math.max(1, Math.min(recentN, sorted.length));
      return sorted
        .slice(0, n)
        .map((c) => modelsByCycleId.get(c.id)!)
        .filter(Boolean);
    }
    // custom mode
    return sorted
      .filter((c) => customIds.has(c.id))
      .map((c) => modelsByCycleId.get(c.id)!)
      .filter(Boolean);
  }, [cycles, mode, recentN, customIds, modelsByCycleId]);

  if (cycles.length === 0) {
    return (
      <div
        data-testid="comparison-view-empty"
        className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center"
      >
        <p className="text-sm text-muted-foreground">
          No cycles to compare yet — log a cycle from Calendar to see the comparison.
        </p>
        <Button asChild>
          <Link to="/">Open Calendar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="comparison-mode">
            Mode
          </label>
          <select
            id="comparison-mode"
            data-testid="comparison-mode"
            className="rounded border bg-background px-2 py-1 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as SelectionMode)}
          >
            <option value="recent">Recent N</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {mode === "recent" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground" htmlFor="comparison-n-input">
              Cycles
            </label>
            <input
              id="comparison-n-input"
              data-testid="comparison-n-input"
              type="number"
              min={1}
              max={12}
              value={recentN}
              onChange={(e) => setRecentN(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
              className="w-16 rounded border bg-background px-2 py-1 text-sm"
            />
          </div>
        )}
      </div>

      {mode === "custom" && (
        <div className="flex flex-wrap gap-2" data-testid="comparison-custom-picker">
          {[...cycles].reverse().map((cycle) => {
            const span = cycleSpanOf(
              results.get(cycle.id),
              dayRecords.filter((r) => r.cycleId === cycle.id),
            );
            const checked = customIds.has(cycle.id);
            return (
              <label
                key={cycle.id}
                className="flex items-center gap-1.5 rounded border px-2 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(customIds);
                    if (e.target.checked) {
                      next.add(cycle.id);
                    } else {
                      next.delete(cycle.id);
                    }
                    setCustomIds(next);
                  }}
                />
                Cycle {cycle.cycleNo} ({span} days)
              </label>
            );
          })}
        </div>
      )}

      {selectedModels.length > 0 ? (
        <CycleComparisonChart models={selectedModels} />
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Select at least one cycle to compare.
        </p>
      )}
    </div>
  );
}
