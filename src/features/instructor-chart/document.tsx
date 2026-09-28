import type { DateKey } from "@/core/engine/types";
import type { ChartCell, ChartCycle, InstructorChartModel } from "./lib";

/**
 * The printable chart: cycle days across, observations down, cycles stacked down the page.
 *
 * Presentational only — no store, no router, no clock. Everything arrives as the model, so the markup
 * that reaches paper is testable without the app and cannot quietly reach for a value the engine did not
 * produce.
 *
 * Two constraints shape the markup more than anything else. The printout must survive black and white, so
 * a monitor reading is the word "Low" or "Peak" and the fertile window is a filled cell rather than a
 * colour. And nothing interactive may live inside the sheet, because a control on the printout is a
 * defect, so the print action and the cycle-count control both sit outside it.
 *
 * Each cycle is its own table. Cycle days run across as columns and observations run down as rows, so an
 * instructor reads a day down a column and an observation's history across a row — the orientation every
 * Marquette chart uses, and the one #26's single-cycle table does not.
 */
export interface InstructorChartDocumentProps {
  model: InstructorChartModel;
  generatedOn: DateKey;
  algorithmEnabled?: boolean;
}

export function InstructorChartDocument({
  model,
  generatedOn,
  algorithmEnabled = true,
}: InstructorChartDocumentProps) {
  return (
    <article
      data-testid="chart-sheet"
      className="print-sheet bg-background text-foreground mx-auto w-full max-w-none space-y-4 p-4 text-sm print:p-0"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <h1 className="text-base font-semibold">Marquette Method — cycle chart</h1>
        <p data-testid="chart-snapshot" className="text-muted-foreground text-xs">
          Snapshot taken {generatedOn}
        </p>
      </header>

      {model.notice ? (
        <p
          data-testid="chart-notice"
          className="border border-border px-2 py-1 text-xs font-medium"
        >
          {model.notice}
        </p>
      ) : null}

      {!algorithmEnabled ? (
        <p data-testid="chart-algorithm-off" className="text-muted-foreground text-xs">
          Interpretation is off. These are your recorded readings only — the app has not marked a
          fertile window on this chart.
        </p>
      ) : null}

      {model.cycles.length === 0 ? (
        <p data-testid="chart-empty" className="text-muted-foreground text-xs">
          No cycles to chart yet.
        </p>
      ) : (
        model.cycles.map((cycle) => <CycleBlock key={cycle.cycleId} cycle={cycle} />)
      )}
    </article>
  );
}

function CycleBlock({ cycle }: { cycle: ChartCycle }) {
  return (
    <section
      data-testid={`chart-cycle-${cycle.cycleNo}`}
      aria-label={`Cycle ${cycle.cycleNo}, Day 1 ${cycle.day1}`}
      // A cycle is never split across a page break: a block split down the middle reads as two cycles.
      className="print:break-inside-avoid space-y-2 border-t pt-3 first:border-t-0 first:pt-0"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <h2 className="text-sm font-semibold">Cycle {cycle.cycleNo}</h2>
        <span className="text-muted-foreground">Day 1 {cycle.day1}</span>
        <span>{cycle.lengthLabel}</span>
        <span>{cycle.peakLine}</span>
      </header>

      <WindowLine cycle={cycle} />
      <BeginLine cycle={cycle} />

      {cycle.warningLines.length > 0 ? (
        <div data-testid={`chart-warnings-${cycle.cycleNo}`} className="space-y-0.5">
          {cycle.warningLines.map((line) => (
            <p key={line} className="text-xs">
              <span aria-hidden="true">! </span>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <Grid cycle={cycle} />

      {cycle.notes ? (
        <p className="text-muted-foreground whitespace-pre-wrap text-xs">{cycle.notes}</p>
      ) : null}
    </section>
  );
}

/** The window as days, in words. The band itself is the filled row inside the grid. */
function WindowLine({ cycle }: { cycle: ChartCycle }) {
  if (cycle.beginRule === null) {
    return null;
  }
  const end = cycle.endDay === null ? "no end determined" : `day ${cycle.endDay}`;
  return (
    <p data-testid={`chart-cycle-${cycle.cycleNo}-window`} className="text-xs">
      <span className="text-muted-foreground">Fertile window: </span>
      day {cycle.beginDay} to {end}
    </p>
  );
}

/**
 * What the begin claim is standing on.
 *
 * This is the point of the document. A window-begin that names the calendar rule also prints the Peak days
 * behind it, each annotated with whether its cycle is charted on this page, so the claim can be checked
 * where it is read rather than taken on trust.
 */
function BeginLine({ cycle }: { cycle: ChartCycle }) {
  if (!cycle.beginNote) {
    return null;
  }
  return (
    <div className="space-y-0.5">
      <p data-testid={`chart-cycle-${cycle.cycleNo}-begin`} className="text-xs">
        {cycle.beginNote}
        {cycle.evidenceNote ? ` ${cycle.evidenceNote}` : ""}
      </p>
      {cycle.evidence.length > 0 ? (
        <p data-testid={`chart-cycle-${cycle.cycleNo}-evidence`} className="text-xs">
          <span className="text-muted-foreground">Peak days used: </span>
          {cycle.evidence.map((entry) => entry.phrase).join("  ·  ")}
        </p>
      ) : null}
    </div>
  );
}

function Grid({ cycle }: { cycle: ChartCycle }) {
  return (
    // The container scrolls on screen so a 28-day cycle is readable before printing. In print the
    // overflow is dropped by the print rules, so the table sits on the paper at its natural width.
    <div className="w-full overflow-x-auto" data-slot="table-container">
      <table className="w-full border-collapse text-[10px] whitespace-nowrap">
        <caption className="sr-only">Cycle {cycle.cycleNo} readings by cycle day</caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 border-b px-1 py-0.5 text-left font-semibold">
              Day
            </th>
            {cycle.columns.map((column) => (
              <th
                key={column.day}
                scope="col"
                data-testid="chart-column-day"
                className="border-b px-0.5 py-0.5 text-center font-semibold"
              >
                {column.day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cycle.rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="border-b px-1 py-0.5 text-left font-medium">
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <Cell key={row.id + index} rowId={row.id} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ rowId, cell }: { rowId: string; cell: ChartCell }) {
  if (rowId === "window") {
    return (
      <td
        data-testid="chart-window-cell"
        data-marked={cell.marked ? "true" : "false"}
        // A filled cell, so the band is legible with colour removed. `marked` is also the accessible name,
        // so the band is not a purely visual cue.
        className={
          cell.marked
            ? "border-b bg-foreground px-0.5 py-0.5 print:bg-black"
            : "border-b px-0.5 py-0.5"
        }
      >
        <span className="sr-only">{cell.marked ? "Fertile" : "Not fertile"}</span>
      </td>
    );
  }
  return (
    <td
      data-testid="chart-cell"
      className="border-b px-0.5 py-0.5 text-center"
      data-empty={cell.empty ? "true" : "false"}
    >
      {cell.text}
    </td>
  );
}
