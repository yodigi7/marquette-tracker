import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { dayInfo } from '@/core/cycleStatus'
import { cycleForDate, cycleResultsByCycleId, latestOpenCycle } from '@/core/store/selectors'
import { useAppStore } from '@/core/store/useAppStore'
import { QuickEntry } from './quick-entry'
import { StartCycleCard } from './start-cycle-card'
import { StatusCard } from './status-card'
import { dateKeyLocal, dayInCycle, todayKey, windowDescription } from './lib'

export function TodayView() {
  const cycles = useAppStore((s) => s.cycles)
  const dayRecords = useAppStore((s) => s.dayRecords)
  const output = useAppStore((s) => s.output)
  const settings = useAppStore((s) => s.settings)

  const today = todayKey()
  const [selected, setSelected] = useState<string>(today)
  const results = cycleResultsByCycleId(output)
  const cycle = cycleForDate(cycles, selected) ?? latestOpenCycle(cycles)
  const cycleDay = cycle ? dayInCycle(cycle.day1, selected) : 0

  if (!cycle) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4">
        <DatePicker date={selected} onChange={setSelected} />
        <StartCycleCard />
      </div>
    )
  }

  const result = results.get(cycle.id)
  const info = result ? dayInfo(result.fertileWindow, result.peakDay !== null, cycleDay) : null
  const windowLine = result ? windowDescription(result.fertileWindow, result.peakDay !== null) : ''
  const nextPeriod = output?.forecast?.expectedPeriodStart ?? null
  const record = dayRecords.find((r) => r.cycleId === cycle.id && r.date === selected)

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-stone-500">
          Cycle {cycle.cycleNo} · day {cycleDay}
        </p>
        <DatePicker date={selected} onChange={setSelected} />
      </div>
      <StatusCard
        status={info?.status ?? null}
        cycleDay={cycleDay}
        source={info?.source ?? null}
        windowLine={windowLine}
        nextPeriod={nextPeriod}
        algorithmEnabled={settings.algorithmEnabled}
      />
      <QuickEntry
        key={`${cycle.id}:${selected}`}
        cycleId={cycle.id}
        date={selected}
        dayInCycle={cycleDay}
        existing={record}
        onSaved={() => undefined}
      />
      <aside className="text-xs text-stone-400">
        Support tool — not a medical device. Verify interpretations with a Marquette-certified instructor.
      </aside>
    </div>
  )
}

function DatePicker({ date, onChange }: { date: string; onChange(d: string): void }) {
  const parsed = parseLocal(date)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" data-testid="date-trigger">
          {date}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={parsed} onSelect={(d) => d && onChange(dateKeyLocal(d))} />
      </PopoverContent>
    </Popover>
  )
}

function parseLocal(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}