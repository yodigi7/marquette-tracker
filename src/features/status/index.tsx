import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { dayInfo } from '@/core/cycleStatus'
import { cycleForDate, cycleResultsByCycleId } from '@/core/store/selectors'
import { useAppStore } from '@/core/store/useAppStore'
import { dateKeyLocal, dayInCycle, parseDateKey, todayKey, windowDescription } from './lib'
import { StatusCard } from './status-card'

export function StatusView() {
  const cycles = useAppStore((state) => state.cycles)
  const output = useAppStore((state) => state.output)
  const algorithmEnabled = useAppStore((state) => state.settings.algorithmEnabled)
  const [selected, setSelected] = useState(todayKey())
  const results = cycleResultsByCycleId(output)
  const cycle = cycleForDate(cycles, selected)
  const cycleDay = cycle ? dayInCycle(cycle.day1, selected) : null
  const result = cycle ? results.get(cycle.id) : undefined
  const info = result && cycleDay !== null ? dayInfo(result.fertileWindow, result.peakDay !== null, cycleDay) : null

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-stone-500">Status</p>
        <DatePicker date={selected} onChange={setSelected} />
      </div>
      {cycle && cycleDay !== null ? (
        <>
          <p className="text-sm text-stone-500">Cycle {cycle.cycleNo} · day {cycleDay}</p>
          <StatusCard
            status={info?.status ?? null}
            cycleDay={cycleDay}
            source={info?.source ?? null}
            windowLine={result ? windowDescription(result.fertileWindow, result.peakDay !== null) : ''}
            nextPeriod={output?.forecast?.expectedPeriodStart ?? null}
            algorithmEnabled={algorithmEnabled}
          />
        </>
      ) : (
        <p className="text-sm text-stone-500">No cycle data for {selected}.</p>
      )}
    </div>
  )
}

function DatePicker({ date, onChange }: { date: string; onChange(date: string): void }) {
  const parsed = parseDateKey(date)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" data-testid="date-trigger">
          {date}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={parsed} onSelect={(value) => value && onChange(dateKeyLocal(value))} />
      </PopoverContent>
    </Popover>
  )
}
