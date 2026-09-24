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

export function HistoryView() {
  const output = useAppStore((s) => s.output)
  const forecast = output?.forecast ?? null

  const cycleRows = output?.cycles ?? []

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <ForecastPanel forecast={forecast} />
      <CycleStats results={cycleRows} forecast={forecast} />
      <CycleTable results={cycleRows} />
    </div>
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
          <p className="text-sm text-stone-500">Not enough data yet. Complete a cycle to see predictions.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Forecast
          <Badge variant="outline">predicted</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Next period start" value={forecast.expectedPeriodStart} />
          <Stat label="Next fertile window" value={`${forecast.nextFertileWindow.begin} → ${forecast.nextFertileWindow.end}`} />
        </div>
        <Stat label="Based on" value={`${forecast.basedOnCycles} cycle${forecast.basedOnCycles === 1 ? '' : 's'}`} />
        {forecast.outOfBandCount >= 2 && (
          <p className="text-xs text-amber-700">
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
  const peakDays = results.filter((r) => r.peakDay !== null)

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
            label="Peak day (avg)"
            value={peakDays.length > 0 ? `day ${Math.round(forecast?.peakDayMean ?? 0)}` : '—'}
          />
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

function CycleTable({ results }: { results: CycleResult[] }) {
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cycles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">No cycles logged yet.</p>
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
              <TableHead>Peak day</TableHead>
              <TableHead>Fertile days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.cycleId}>
                <TableCell>{result.cycleNo}</TableCell>
                <TableCell>{result.day1}</TableCell>
                <TableCell>{result.length ?? 'open'}</TableCell>
                <TableCell>{result.peakDay !== null ? `day ${result.peakDay}` : '—'}</TableCell>
                <TableCell>{countFertileDays(result)}</TableCell>
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
      <p className="text-[11px] font-medium text-stone-400">{label}</p>
      <p className="text-sm text-stone-800">{value}</p>
    </div>
  )
}
