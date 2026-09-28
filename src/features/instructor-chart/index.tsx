import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { todayKey } from "@/core/dateKeys";
import { DEFAULT_HISTORY_WINDOW } from "@/core/engine/marquette";
import { useAppStore } from "@/core/store/useAppStore";
import { InstructorChartDocument } from "./document";
import { buildInstructorChartModel } from "./lib";

/**
 * The instructor chart: a run of cycles, laid out the way an instructor reads a chart, printed.
 *
 * Reads the same store snapshot every other view reads and derives nothing the engine has not already
 * derived. Nothing is written. The count lives in the URL rather than in settings — it is a per-print
 * choice, and a search param survives a refresh and is inspectable — and it defaults to the configured
 * history window, which is itself six. The six is therefore not a second constant.
 */
export function InstructorChartView() {
  const cycles = useAppStore((state) => state.cycles);
  const dayRecords = useAppStore((state) => state.dayRecords);
  const output = useAppStore((state) => state.output);
  const settings = useAppStore((state) => state.settings);
  const [searchParams, setSearchParams] = useSearchParams();

  // Read once per mount so the printed generation date cannot drift while the view is open.
  const generatedOn = useMemo(() => todayKey(), []);

  const historyWindow = settings.historyWindow ?? DEFAULT_HISTORY_WINDOW;
  const requested = Number.parseInt(searchParams.get("cycles") ?? "", 10);
  const cycleCount = Number.isFinite(requested) && requested > 0 ? requested : historyWindow;

  const model = useMemo(() => {
    if (!output) {
      return null;
    }
    return buildInstructorChartModel({
      results: output.cycles,
      records: dayRecords,
      algorithmEnabled: settings.algorithmEnabled,
      cycleCount,
    });
  }, [output, dayRecords, settings.algorithmEnabled, cycleCount]);

  if (!model || cycles.length === 0) {
    return <EmptyChart />;
  }

  function setCount(value: number) {
    const next = new URLSearchParams(searchParams);
    if (value === historyWindow) {
      next.delete("cycles");
    } else {
      next.set("cycles", String(value));
    }
    setSearchParams(next);
  }

  return (
    <div className="space-y-3">
      {/* Everything here is chrome. A control on the printout is a defect, so all of it is print-hidden
          and the sheet below is the whole of what reaches the paper. */}
      <div
        data-testid="chart-toolbar"
        className="print:hidden mx-auto flex w-full flex-wrap items-center gap-3"
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/history">Back to history</Link>
        </Button>
        <Button data-testid="chart-print" size="sm" onClick={() => window.print()}>
          <PrinterIcon />
          Print / save as PDF
        </Button>
        <div className="flex items-center gap-2">
          <Label htmlFor="chart-count" className="text-xs">
            Cycles
          </Label>
          <input
            id="chart-count"
            data-testid="chart-count"
            type="number"
            min={1}
            max={Math.max(1, cycles.length)}
            defaultValue={cycleCount}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(next) && next > 0) {
                setCount(next);
              }
            }}
            className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm"
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Printing hands the page to your browser — the app produces no file. Choose landscape if
          your printer has it.
        </p>
      </div>
      <InstructorChartDocument
        model={model}
        generatedOn={generatedOn}
        algorithmEnabled={settings.algorithmEnabled}
      />
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      data-testid="chart-empty-view"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <p className="text-muted-foreground text-sm">
        No cycles to chart yet — log a day from the Calendar, or open History once you have.
      </p>
      <Button asChild>
        <Link to="/history">Open History</Link>
      </Button>
    </div>
  );
}
