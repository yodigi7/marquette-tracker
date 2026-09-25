import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_SOURCE_VISUALS,
  FERTILITY_TEXT_VISUALS,
  fertilityStatusBadge,
} from '@/lib/fertility-visuals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DayStatus } from '@/core/engine/types'
import { STATUS_LABELS } from './lib'

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
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn('text-sm', FERTILITY_TEXT_VISUALS.muted)}>
            Algorithm is off — data is logged but fertile-window status is not computed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status · cycle day {cycleDay}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {status ? (
            <Badge className={cn(fertilityStatusBadge(status, source))}>{STATUS_LABELS[status]}</Badge>
          ) : (
            <p className={cn('text-sm', FERTILITY_TEXT_VISUALS.muted)}>No cycle yet — log a Day 1 to begin tracking.</p>
          )}
          {source && status && <Badge variant="outline" className={FERTILITY_SOURCE_VISUALS[source].badge}>{source}</Badge>}
        </div>
        <p className={cn('text-sm', FERTILITY_TEXT_VISUALS.body)}>{description}</p>
        {nextPeriod && (
          <p className={cn('text-sm', FERTILITY_TEXT_VISUALS.body)}>
            <span data-testid="status-forecast" className={FERTILITY_FORECAST_VISUAL.text}>Estimated next period:</span> {nextPeriod}
          </p>
        )}
      </CardContent>
    </Card>
  )
}