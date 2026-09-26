import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CycleResult, Forecast } from '@/core/engine/types'
import { useAppStore } from '@/core/store/useAppStore'
import { cn } from '@/lib/utils'
import { FERTILITY_FORECAST_VISUAL, FERTILITY_TEXT_VISUALS } from '@/lib/fertility-visuals'

export function HistoryView() {
  const output = useAppStore((s) => s.output)
  const algorithmEnabled = useAppStore((s) => s.settings.algorithmEnabled)
  const forecast = output?.forecast ?? null
  const cycleRows = output?.cycles ?? []

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {algorithmEnabled ? (
        <>
          <ForecastPanel forecast={forecast} />
          <CycleStats results={cycleRows} forecast={forecast} />
        </>
      ) : (
        <LoggingOnlyCard />
      )}
      <CycleTable results={cycleRows} showDerived={algorithmEnabled} />
    </div>
  )
}

function LoggingOnlyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        <p data-testid="history-logging-only" className={cn('text-sm', FERTILITY_TEXT_VISUALS.muted)}>
          Algorithm is off — logged cycle information remains available, but fertility forecasts and derived summaries are hidden.
        </p>
      </CardContent>
    </Card>
  )
}

function ForecastPanel({ forecast }: { forecast: Forecast | null }) {
  if (!forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn('text-sm', FERTILITY_TEXT_VISUALS.muted)}>Not enough data yet. Complete a cycle to see predictions.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Forecast
          <Badge variant="outline" className={FERTILITY_FORECAST_VISUAL.text}>predicted</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Next period start" value={forecast.expectedPeriodStart} />
          <Stat label="Next fertile window" value={`${forecast.nextFertileWindow.begin} → ${forecast.nextFertileWindow.end}`} />
        </div>
        <Stat label="Based on" value={`${forecast.basedOnCycles} cycle${forecast.basedOnCycles === 1 ? '' : 's'}`} />
        <p className={cn('text-xs', FERTILITY_TEXT_VISUALS.muted)}>
          Projected dates use the median of your last {forecast.lookbackWindow} completed cycle
          {forecast.lookbackWindow === 1 ? '' : 's'} — as many as you have on record, up to your
          configured window of {forecast.configuredLookbackWindow}. The median is used so a single
          atypical cycle does not shift every date. The averages above are shown for reference and are
          not what produces them.
        </p>
        {forecast.outOfBandCount >= 2 && (
          <p className={cn('text-xs', FERTILITY_TEXT_VISUALS.warning)}>
            {forecast.outOfBandCount} cycles fell outside the 21–42 day band. Consider consulting a Marquette-certified instructor.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function CycleStats({ results, forecast }: { results: CycleResult[]; forecast: Forecast | null }) {
  const fertileTotals = results.map(countFertileDays)
  const total = fertileTotals.reduce((sum, n) => sum + n, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cycle stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Avg length" value={forecast ? `${forecast.meanLength} days` : '—'} />
          <Stat label="Median length" value={forecast ? `${forecast.medianLength} days` : '—'} />
          <Stat label="Range" value={forecast ? `${forecast.earliestLength}–${forecast.latestLength}` : '—'} />
          <Stat
            label="Peak day range"
            value={
              forecast && forecast.peakDayEarliest > 0
                ? `day ${forecast.peakDayEarliest}–${forecast.peakDayLatest}`
                : '—'
            }
          />
          <Stat label="Fertile days" value={`${total} (avg ${fertileTotals.length ? (total / fertileTotals.length).toFixed(1) : 0})`} />
        </div>
      </CardContent>
    </Card>
  )
}

function CycleTable({ results, showDerived }: { results: CycleResult[]; showDerived: boolean }) {
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cycles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn('text-sm', FERTILITY_TEXT_VISUALS.muted)}>No cycles logged yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cycles</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cycle</TableHead>
              <TableHead>Day 1</TableHead>
              <TableHead>Length</TableHead>
              {showDerived && <TableHead>Peak day</TableHead>}
              {showDerived && <TableHead>Fertile days</TableHead>}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.cycleId}>
                <TableCell>{result.cycleNo}</TableCell>
                <TableCell>{result.day1}</TableCell>
                <TableCell>{result.length ?? 'open'}</TableCell>
                {showDerived && <TableCell>{result.peakDay !== null ? `day ${result.peakDay}` : '—'}</TableCell>}
                {showDerived && <TableCell>{countFertileDays(result)}</TableCell>}
                <TableCell>
                  {result.length === null ? <Badge variant="secondary">Open</Badge> : <Badge variant="outline">Closed</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function countFertileDays(result: CycleResult): number {
  return result.days.filter((d) => d.status === 'fertile').length
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={cn('text-[11px] font-medium', FERTILITY_TEXT_VISUALS.muted)}>{label}</p>
      <p className={cn('text-sm', FERTILITY_TEXT_VISUALS.body)}>{value}</p>
    </div>
  )
}
