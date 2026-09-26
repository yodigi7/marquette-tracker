import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_TEXT_VISUALS,
  fertilityStatusBadge,
} from "@/lib/fertility-visuals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DayStatus, EngineWarning } from "@/core/engine/types";
import { STATUS_LABELS, warningBanner } from "./lib";

interface StatusCardProps {
  status: DayStatus | null;
  cycleDay: number;
  windowLine: string;
  nextPeriod: string | null;
  algorithmEnabled: boolean;
  /** Warnings for the selected cycle; only the reconciliation kinds are rendered. */
  warnings: EngineWarning[];
  /** Computed window end for the selected cycle, quoted by the warning text. */
  windowEnd: number | null;
}

export function StatusCard({
  status,
  cycleDay,
  windowLine: description,
  nextPeriod,
  algorithmEnabled,
  warnings,
  windowEnd,
}: StatusCardProps) {
  if (!algorithmEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-sm", FERTILITY_TEXT_VISUALS.muted)}>
            Algorithm is off — data is logged but fertile-window status is not computed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const banner = warningBanner(warnings, windowEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status · cycle day {cycleDay}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Above the badge: the status is the model's answer, the banner reports that a recorded
            reading contradicts it, and the correction must not sit below the claim it corrects. */}
        {banner && (
          <p
            data-testid="status-warning"
            role="status"
            className={cn(
              "rounded-md border border-fertility-warning/40 bg-fertility-warning/10 px-3 py-2",
              "text-xs",
              FERTILITY_TEXT_VISUALS.warning,
            )}
          >
            {banner}
          </p>
        )}
        <div className="flex items-center gap-2">
          {status ? (
            <Badge className={cn(fertilityStatusBadge(status))}>{STATUS_LABELS[status]}</Badge>
          ) : (
            <p className={cn("text-sm", FERTILITY_TEXT_VISUALS.muted)}>
              No cycle yet — log a Day 1 to begin tracking.
            </p>
          )}
        </div>
        <p className={cn("text-sm", FERTILITY_TEXT_VISUALS.body)}>{description}</p>
        {nextPeriod && (
          <p className={cn("text-sm", FERTILITY_TEXT_VISUALS.body)}>
            <span data-testid="status-forecast" className={FERTILITY_FORECAST_VISUAL.text}>
              Estimated next period:
            </span>{" "}
            {nextPeriod}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
