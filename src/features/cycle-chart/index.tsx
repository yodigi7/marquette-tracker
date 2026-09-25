import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cycleResultsByCycleId, recordsForMode } from '@/core/store/selectors'
import { useAppStore } from '@/core/store/useAppStore'
import { buildStripModel, cycleLabel, cycleSpanOf, resolveSelectedCycle } from './lib'
import { StripChart } from './strip-chart'

export function CycleChartView() {
  const cycles = useAppStore((s) => s.cycles)
  const allDayRecords = useAppStore((s) => s.dayRecords)
  const settings = useAppStore((s) => s.settings)
  const dayRecords = useMemo(() => recordsForMode(allDayRecords, settings.algorithmEnabled), [allDayRecords, settings.algorithmEnabled])
  const output = useAppStore((s) => s.output)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const { cycleId } = useParams()
  const navigate = useNavigate()

  const selected = useMemo(() => resolveSelectedCycle(cycles, cycleId), [cycles, cycleId])
  const results = useMemo(() => cycleResultsByCycleId(output), [output])

  const options = useMemo(
    () =>
      [...cycles].reverse().map((cycle) => ({
        cycle,
        span: cycleSpanOf(results.get(cycle.id), dayRecords.filter((r) => r.cycleId === cycle.id)),
      })),
    [cycles, results, dayRecords],
  )

  const model = useMemo(() => {
    if (!selected) {
      return null
    }
    return buildStripModel(
      selected,
      results.get(selected.id),
      dayRecords.filter((record) => record.cycleId === selected.id),
      settings.algorithmEnabled,
    )
  }, [selected, results, dayRecords, settings.algorithmEnabled])

  if (!model) {
    return <EmptyChart />
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Select value={model.cycleId} onValueChange={(id) => navigate(`/cycle/${id}`)}>
          <SelectTrigger data-testid="cycle-selector" aria-label="Cycle" className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(({ cycle, span }) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycleLabel(cycle, span)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <OverlayToggles
          showMucus={settings.overlayMucus}
          onMucusChange={(next) => updateSettings({ overlayMucus: next })}
          showBbt={settings.overlayBbt}
          onBbtChange={(next) => updateSettings({ overlayBbt: next })}
          showIntercourse={settings.overlayIntercourse}
          onIntercourseChange={(next) => updateSettings({ overlayIntercourse: next })}
        />
      </div>
      <Legend />
      <div aria-label="Cycle chart">
        <StripChart
          model={model}
          showMucus={settings.overlayMucus}
          showBbt={settings.overlayBbt}
          showIntercourse={settings.overlayIntercourse}
        />
      </div>
    </div>
  )
}

function OverlayToggles({
  showMucus,
  onMucusChange,
  showBbt,
  onBbtChange,
  showIntercourse,
  onIntercourseChange,
}: {
  showMucus: boolean
  onMucusChange: (next: boolean) => void
  showBbt: boolean
  onBbtChange: (next: boolean) => void
  showIntercourse: boolean
  onIntercourseChange: (next: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SwitchControl label="Mucus" checked={showMucus} onCheckedChange={onMucusChange} />
      <SwitchControl label="Temperature (BBT)" checked={showBbt} onCheckedChange={onBbtChange} />
      <SwitchControl label="Intercourse" checked={showIntercourse} onCheckedChange={onIntercourseChange} />
    </div>
  )
}

function SwitchControl({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </label>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
      <LegendItem className="rounded bg-sky-400" label="Low" />
      <LegendItem className="rounded bg-amber-500" label="High" />
      <LegendItem className="rounded bg-violet-600" label="Peak" />
      <LegendItem className="rounded border border-dashed border-rose-600" label="Predicted window" />
      <LegendItem className="rounded border border-solid border-rose-600" label="Confirmed window" />
      <LegendDot className="bg-fuchsia-500" label="Mucus" />
      <LegendDot className="bg-stone-500" label="BBT" />
      <LegendDot className="bg-teal-600" label="Intercourse" />
    </div>
  )
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

function EmptyChart() {
  return (
    <div data-testid="cycle-chart-empty" className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">No cycle chart yet — log a day from Calendar to see your strip chart.</p>
      <Button asChild>
        <Link to="/">Open Calendar</Link>
      </Button>
    </div>
  )
}