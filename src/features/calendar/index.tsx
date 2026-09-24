import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dayInfo } from '@/core/cycleStatus'
import { dayInCycle, todayKey } from '@/core/dateKeys'
import type { EngineOutput } from '@/core/engine/engineSdk'
import { cycleForDate, cycleResultsByCycleId } from '@/core/store/selectors'
import { useAppStore } from '@/core/store/useAppStore'
import { DayCell } from './day-cell'
import { monthGrid, monthTitle, resolveCell, shiftMonth, weekdayLabels } from './grid'
import { QuickEntry } from '@/features/today/quick-entry'

export function CalendarView() {
  const cycles = useAppStore((s) => s.cycles)
  const dayRecords = useAppStore((s) => s.dayRecords)
  const output = useAppStore((s) => s.output)
  const interpreted = useAppStore((s) => s.settings.algorithmEnabled)
  const weekStart = useAppStore((s) => s.settings.weekStart)

  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const today = todayKey()
  const grid = monthGrid(cursor.year, cursor.month, weekStart)
  const results = cycleResultsByCycleId(output)
  const forecast = output?.forecast?.nextFertileWindow
  const predictedOvulationDay = predictedOvulationOf(output)

  const selectedCycle = selected ? cycleForDate(cycles, selected) : undefined
  const selectedRecord = selected && selectedCycle ? dayRecords.find((r) => r.cycleId === selectedCycle.id && r.date === selected) : undefined
  const selectedDay = selected && selectedCycle ? dayInCycle(selectedCycle.day1, selected) : 0
  const selectedResult = selectedCycle ? results.get(selectedCycle.id) : undefined
  const selectedInfo = selectedResult && selected ? dayInfo(selectedResult.fertileWindow, selectedResult.peakDay !== null, selectedDay) : null

  return (
    <div className="mx-auto w-full max-w-lg space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" aria-label="Previous month" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{monthTitle(cursor.year, cursor.month)}</span>
          <Button variant="ghost" size="sm" onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}>
            Today
          </Button>
        </div>
        <Button variant="outline" size="sm" aria-label="Next month" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels(weekStart).map((label) => (
          <div key={label} className="pb-1 text-center text-[11px] font-medium text-stone-400">
            {label}
          </div>
        ))}
        {grid.weeks.flatMap((week, w) =>
          week.map((dateKey, d) => {
            if (!dateKey) {
              return <div key={`${w}-${d}`} />
            }
            const cell = resolveCell(cycles, dayRecords, results, forecast, dateKey, today, predictedOvulationDay)
            return (
              <DayCell
                key={dateKey}
                dateKey={dateKey}
                dayNumber={Number(dateKey.slice(8))}
                info={interpreted ? cell.info : null}
                forecast={interpreted ? cell.forecast : false}
                menses={cell.menses}
                monitor={cell.monitor}
                intercourse={cell.intercourse}
                ovulation={interpreted ? cell.ovulation : false}
                isToday={dateKey === today}
                onSelect={(d) => setSelected(d)}
              />
            )
          }),
        )}
      </div>

      <Legend />

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {selected && selectedCycle && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected === today ? 'Day details' : selected}
                </DialogTitle>
                <DialogDescription>
                  Status:{' '}
                  <span className="font-medium text-foreground">
                    {selectedInfo
                      ? `${selectedInfo.status}${selectedInfo.source === 'confirmed' ? ' (confirmed)' : ' (predicted)'}`
                      : 'no status'}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <QuickEntry
                key={`${selectedCycle.id}:${selected}`}
                cycleId={selectedCycle.id}
                date={selected}
                dayInCycle={selectedDay}
                existing={selectedRecord}
                onSaved={() => setSelected(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
      <LegendItem className="rounded bg-rose-200" label="Fertile" />
      <LegendItem className="rounded bg-amber-100" label="Pre-fertile" />
      <LegendItem className="rounded bg-emerald-100" label="Post-peak" />
      <LegendItem className="rounded border border-dashed border-violet-300" label="Predicted window" />
      <LegendDot className="bg-red-500" label="Menses" />
      <LegendDot className="bg-sky-400" label="Low" />
      <LegendDot className="bg-amber-500" label="High" />
      <LegendDot className="bg-violet-600" label="Peak" />
      <LegendDot className="bg-teal-500" label="Intercourse" />
      <LegendDot className="border-2 border-violet-600 bg-white" label="Predicted ovulation" />
    </div>
  )
}

function predictedOvulationOf(output: EngineOutput | null): number | undefined {
  const forecast = output?.forecast
  if (!forecast) {
    return undefined
  }
  // Prefer the average historical Peak day; fall back to a typical mid-cycle day.
  return forecast.peakDayEarliest > 0 ? Math.round(forecast.peakDayMean) : 14
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-2.5 w-2.5', className)} />
      {label}
    </span>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-1.5 w-1.5 rounded-full', className)} />
      {label}
    </span>
  )
}