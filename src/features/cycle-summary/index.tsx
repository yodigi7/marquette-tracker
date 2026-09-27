import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { todayKey } from "@/core/dateKeys";
import { useAppStore } from "@/core/store/useAppStore";
import { SummaryDocument } from "./document";
import { buildSummaryModel } from "./lib";

/**
 * The cycle summary: one cycle, one page, produced by printing.
 *
 * Reads the same store snapshot every other view reads and derives nothing the engine has not already
 * derived — see `openspec/changes/instructor-cycle-summary/design.md`. Nothing is written, and the
 * future-cycle projection is never consulted, so a projected day cannot reach the document.
 */
export function SummaryView() {
  const cycles = useAppStore((state) => state.cycles);
  const dayRecords = useAppStore((state) => state.dayRecords);
  const output = useAppStore((state) => state.output);
  const settings = useAppStore((state) => state.settings);
  const { cycleId } = useParams();

  // Read once per mount so the printed generation date cannot drift while the view is open, and so
  // the title is set from the same value the document shows.
  const generatedOn = useMemo(() => todayKey(), []);

  const cycle = cycles.find((entry) => entry.id === cycleId);
  const result =
    cycle && output ? output.cycles.find((entry) => entry.cycleId === cycle.id) : undefined;

  useDocumentTitle(
    cycle && result ? `Marquette cycle summary - cycle ${result.cycleNo} - ${generatedOn}` : null,
  );

  const model = useMemo(() => {
    if (!cycle || !result || !output) {
      return null;
    }
    return buildSummaryModel({
      result,
      records: dayRecords.filter((record) => record.cycleId === cycle.id),
      // `output.warnings` is the flattened superset and already contains this cycle's own warnings, so
      // `result.warnings` is deliberately not also passed — see `design.md` Decision 4.
      warnings: output.warnings.filter((warning) => warning.cycleNo === result.cycleNo),
      band: { min: settings.cycleMinLength, max: settings.cycleMaxLength },
      algorithmEnabled: settings.algorithmEnabled,
    });
  }, [
    cycle,
    result,
    output,
    dayRecords,
    settings.algorithmEnabled,
    settings.cycleMinLength,
    settings.cycleMaxLength,
  ]);

  if (!model || !cycle) {
    return <EmptySummary />;
  }

  return (
    <div className="space-y-3">
      {/* Everything here is chrome. A control on the printout is a defect, so all of it is print-hidden
          and the sheet below is the whole of what reaches the paper. */}
      <div
        data-testid="summary-toolbar"
        className="print:hidden mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/cycle/${cycle.id}`}>Back to chart</Link>
          </Button>
          <p className="text-muted-foreground text-xs">
            A snapshot of this cycle. Printing or saving it hands the page to your browser — the app
            produces no file.
          </p>
        </div>
        <Button data-testid="summary-print" size="sm" onClick={() => window.print()}>
          <PrinterIcon />
          Print / save as PDF
        </Button>
      </div>
      <SummaryDocument
        model={model}
        generatedOn={generatedOn}
        cycleNotes={cycle.notes ? cycle.notes : null}
        algorithmEnabled={settings.algorithmEnabled}
      />
    </div>
  );
}

/** Sets the page title while the document is open so a saved file carries the cycle's name. */
function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title === null) {
      return;
    }
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

function EmptySummary() {
  return (
    <div data-testid="summary-empty" className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">
        No cycle to summarise — open a cycle chart, or log a day from Calendar to begin tracking.
      </p>
      <Button asChild>
        <Link to="/">Open Calendar</Link>
      </Button>
    </div>
  );
}
