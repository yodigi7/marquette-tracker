import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DayStatus } from '@/core/engine/types'
import { STATUS_LABELS, STATUS_TONES } from './lib'

interface StatusCardProps {
  status: DayStatus | null
  cycleDay: number
  source: 'confirmed' | 'predicted' | null
  windowLine: string
  nextPeriod: string | null
  algorithmEnabled: boolean
}

export function StatusCard({ status, cycleDay, source, windowLine: description, nextPeriod, algorithmEnabled }: StatusCardProps) {
  if (!algorithmEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            Algorithm is off — data is logged but fertile-window status is not computed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today · cycle day {cycleDay}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {status ? (
            <Badge className={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
          ) : (
            <p className="text-sm text-stone-500">No cycle yet — log a Day 1 to begin tracking.</p>
          )}
          {source && status && <Badge variant="outline">{source}</Badge>}
        </div>
        <p className="text-sm text-stone-600">{description}</p>
        {nextPeriod && <p className="text-sm text-stone-600">Estimated next period: {nextPeriod}</p>}
      </CardContent>
    </Card>
  )
}