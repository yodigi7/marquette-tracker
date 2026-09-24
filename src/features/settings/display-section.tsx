import { useAppStore } from '@/core/store/useAppStore'
import type { WeekStart } from '@/core/store/entities'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NumberField } from './number-field'

const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
]

const CYCLE_BAND_MIN = 15
const CYCLE_BAND_MAX = 60

export function DisplaySection() {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="settings-week-start">Week starts on</Label>
        <Select
          value={settings.weekStart}
          onValueChange={(value) => updateSettings({ weekStart: value as WeekStart })}
        >
          <SelectTrigger id="settings-week-start" data-testid="settings-week-start">
            <SelectValue placeholder="Select a week start" />
          </SelectTrigger>
          <SelectContent>
            {WEEK_START_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField
          testId="settings-cycle-min"
          label="Minimum cycle length (days)"
          value={settings.cycleMinLength}
          min={CYCLE_BAND_MIN}
          max={settings.cycleMaxLength - 1}
          extraRule={(parsed) =>
            parsed >= settings.cycleMaxLength ? 'Must be below the maximum cycle length' : null
          }
          onCommit={(value) => updateSettings({ cycleMinLength: value })}
        />
        <NumberField
          testId="settings-cycle-max"
          label="Maximum cycle length (days)"
          value={settings.cycleMaxLength}
          min={settings.cycleMinLength + 1}
          max={CYCLE_BAND_MAX}
          extraRule={(parsed) =>
            parsed <= settings.cycleMinLength ? 'Must be above the minimum cycle length' : null
          }
          onCommit={(value) => updateSettings({ cycleMaxLength: value })}
        />
      </div>
    </div>
  )
}