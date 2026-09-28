import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DateKey } from "@/core/engine/types";
import {
  ABSENT,
  BLOOD_FLOW_LABELS,
  MONITOR_LABELS,
  MUCUS_LABELS,
  NO_READING,
  PREGNANCY_LABELS,
  algorithmOffNote,
  dayRangeLine,
  exclusionsNote,
  lengthLine,
  peakLine,
  snapshotLine,
  type SummaryDay,
  type SummaryModel,
} from "./lib";

/**
 * The printable document: one cycle, one page, a person can read.
 *
 * Presentational only — no store, no router, no clock. Everything it shows comes in as the model, so
 * the section structure is testable without the app and the document cannot quietly reach for a value
 * the engine did not produce.
 *
 * Two constraints shape the markup more than anything else. The printout must be readable in black and
 * white, so every value is carried in words — a monitor reading is "Low" or "Peak", never a coloured
 * band. And nothing interactive may live inside the sheet, because a control on the printout is a
 * defect, so the print action sits outside it.
 */
export interface SummaryDocumentProps {
  model: SummaryModel;
  generatedOn: DateKey;
  /** The cycle's own note, when the user wrote one. */
  cycleNotes: string | null;
  /** The algorithm toggle, which decides whether the derived half is present at all. */
  algorithmEnabled?: boolean;
}

export function SummaryDocument({
  model,
  generatedOn,
  cycleNotes,
  algorithmEnabled = true,
}: SummaryDocumentProps) {
  return (
    <article
      data-testid="summary-sheet"
      className="print-sheet bg-background text-foreground mx-auto w-full max-w-3xl space-y-4 rounded-lg border p-5 text-sm print:max-w-none print:rounded-none print:border-0 print:p-0"
    >
      <Header model={model} generatedOn={generatedOn} algorithmEnabled={algorithmEnabled} />

      {algorithmEnabled ? (
        <>
          <WindowSection model={model} />
          <WarningsSection model={model} />
        </>
      ) : (
        <p data-testid="summary-algorithm-off" className="text-muted-foreground text-xs">
          {algorithmOffNote()}
        </p>
      )}

      <DayTable model={model} />

      {cycleNotes ? (
        <Section title="Notes for this cycle" testId="summary-cycle-notes">
          <p className="whitespace-pre-wrap">{cycleNotes}</p>
        </Section>
      ) : null}

      <Footer generatedOn={generatedOn} />
    </article>
  );
}

function Header({
  model,
  generatedOn,
  algorithmEnabled,
}: {
  model: SummaryModel;
  generatedOn: DateKey;
  algorithmEnabled: boolean;
}) {
  return (
    <header className="space-y-3 border-b pb-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-semibold">Marquette Method — cycle summary</h1>
        <p data-testid="summary-snapshot" className="text-muted-foreground text-xs">
          {snapshotLine(generatedOn)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        <Fact label="Cycle" testId="summary-cycle-no">
          {model.cycleNo}
        </Fact>
        <Fact label="Day 1" testId="summary-day1">
          {model.day1}
        </Fact>
        <Fact label="Days" testId="summary-day-range">
          {dayRangeLine(model.firstDay, model.lastDay)}
        </Fact>
        <Fact label="Length" testId="summary-length">
          {lengthLine(model.length, model.lastDay)}
        </Fact>
        {/* Omitted, not filled in, with interpretation off: the engine reports no Peak day because it
            was not computed, and saying "no Peak reading recorded" would contradict the two Peak
            readings sitting in the raw log directly below. */}
        {algorithmEnabled ? (
          <Fact label="Monitor Peak" testId="summary-peak">
            {peakLine(model.firstPeakDay, model.lastPeakDay, model.peakCount)}
          </Fact>
        ) : null}
        <Fact label="State" testId="summary-state">
          {model.open ? "In progress" : "Closed"}
        </Fact>
      </dl>
    </header>
  );
}

function Fact({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd data-testid={testId}>{children}</dd>
    </div>
  );
}

function WindowSection({ model }: { model: SummaryModel }) {
  const window = model.window;
  if (!window) {
    return null;
  }

  return (
    <Section title="Fertile window" testId="summary-window">
      <p className="text-sm font-medium">
        {window.end === null
          ? `From cycle day ${window.begin}, with no end set yet`
          : `Cycle day ${window.begin} to cycle day ${window.end} (${window.days} ${
              window.days === 1 ? "day" : "days"
            })`}
      </p>
      <dl className="space-y-1 text-xs">
        <div>
          <dt className="text-muted-foreground">Opened by</dt>
          <dd>{window.beginBasis}</dd>
          <dd className="text-muted-foreground">Rule: {window.beginRule}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Closed by</dt>
          <dd>{window.endBasis}</dd>
          <dd className="text-muted-foreground">Rule: {window.endRule}</dd>
        </div>
      </dl>
    </Section>
  );
}

function WarningsSection({ model }: { model: SummaryModel }) {
  if (model.warnings.length === 0) {
    return null;
  }
  return (
    <Section title="Protocol notes the app flagged for this cycle" testId="summary-warnings">
      <ul className="list-disc space-y-1 pl-4 text-xs">
        {model.warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
    </Section>
  );
}

/** Column order is fixed, and each optional column is dropped rather than shown empty. */
function DayTable({ model }: { model: SummaryModel }) {
  const { columns } = model;
  return (
    <Section title="Readings by cycle day" testId="summary-table-section">
      <Table data-testid="summary-table" className="text-[10px] print:text-[8px]">
        <TableHeader>
          <TableRow className="[&>th]:h-5 [&>th]:px-1 [&>th]:py-0">
            <TableHead className="w-8">Day</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Monitor</TableHead>
            {columns.menses ? <TableHead>Menses</TableHead> : null}
            {columns.mucus ? <TableHead>Mucus</TableHead> : null}
            {columns.bbt ? <TableHead>Temp</TableHead> : null}
            {columns.intercourse ? <TableHead>Intercourse</TableHead> : null}
            {columns.pregnancyTest ? <TableHead>Test</TableHead> : null}
            {columns.symptoms ? <TableHead>Symptoms</TableHead> : null}
            {columns.notes ? <TableHead>Notes</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {model.days.map((day) => (
            <TableRow
              key={day.day}
              data-testid={`summary-day-${day.day}`}
              data-monitor={day.monitor ?? ""}
              className="[&>td]:px-1 [&>td]:py-0"
            >
              <TableCell>{day.day}</TableCell>
              <TableCell>{day.date}</TableCell>
              <TableCell className="font-medium">
                {day.monitor === null ? NO_READING : MONITOR_LABELS[day.monitor]}
              </TableCell>
              {columns.menses ? <TableCell>{flow(day)}</TableCell> : null}
              {columns.mucus ? <TableCell>{mucus(day)}</TableCell> : null}
              {columns.bbt ? (
                <TableCell>{day.bbt === null ? ABSENT : day.bbt.toFixed(1)}</TableCell>
              ) : null}
              {columns.intercourse ? (
                <TableCell>{day.intercourse ? "Yes" : ABSENT}</TableCell>
              ) : null}
              {columns.pregnancyTest ? (
                <TableCell>
                  {day.pregnancyTest === null ? ABSENT : PREGNANCY_LABELS[day.pregnancyTest]}
                </TableCell>
              ) : null}
              {columns.symptoms ? (
                <TableCell>{day.symptoms.length > 0 ? day.symptoms.join(", ") : ABSENT}</TableCell>
              ) : null}
              {columns.notes ? <TableCell>{day.notes ?? ABSENT}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}

function flow(day: SummaryDay): string {
  return day.bloodFlow === null ? ABSENT : BLOOD_FLOW_LABELS[day.bloodFlow];
}

function mucus(day: SummaryDay): string {
  return day.mucus === null ? ABSENT : MUCUS_LABELS[day.mucus];
}

function Section({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section data-testid={testId} className="print:break-inside-avoid space-y-1">
      <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Footer({ generatedOn }: { generatedOn: DateKey }) {
  return (
    <footer className="space-y-1 border-t pt-2 text-[10px] print:text-[8px]">
      <p>
        Every value on this document is either a reading you logged or a protocol rule applied to
        your readings. Nothing on it is a prediction.
      </p>
      <p data-testid="summary-exclusions" className="text-muted-foreground">
        {exclusionsNote()}
      </p>
      <p className="text-muted-foreground">
        Generated by Marquette Tracker on {generatedOn}. This document stays on your device; the app
        does not upload it, and it can only be shared by you.
      </p>
    </footer>
  );
}
