import { useAppStore } from '@/core/store/useAppStore'
import type { Goal, PostPeakFillMode } from '@/core/engine/types'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { NumberField } from './number-field'

const POST_PEAK_FILL_OPTIONS: { value: PostPeakFillMode; label: string }[] = [
  { value: 'auto-after-window', label: 'Automatically after fertile window' },
  { value: 'after-user-low', label: 'After first user Low' },
]

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'track-only', label: 'Track only' },
  { value: 'avoid-pregnancy', label: 'Avoid pregnancy' },
  { value: 'achieve-pregnancy', label: 'Achieve pregnancy' },
]

export function CoreSection() {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="settings-goal">Goal</Label>
        <Select
          value={settings.goal}
          onValueChange={(value) => updateSettings({ goal: value as Goal })}
        >
          <SelectTrigger id="settings-goal" data-testid="settings-goal">
            <SelectValue placeholder="Select a goal" />
          </SelectTrigger>
          <SelectContent>
            {GOAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="settings-algorithm">Fertile-window algorithm</Label>
          <p className="text-sm text-stone-500">
            Off = log observations only, without interpreting them.
          </p>
        </div>
        <Switch
          id="settings-algorithm"
          data-testid="settings-algorithm"
          checked={settings.algorithmEnabled}
          onCheckedChange={(checked) => updateSettings({ algorithmEnabled: checked })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="settings-post-peak-fill-mode">Inferred post-Peak readings</Label>
        <p className="text-sm text-stone-500">
          Choose when assumed Low readings may be stored after the fertile window.
        </p>
        <Select
          value={settings.postPeakFillMode}
          onValueChange={(value) => updateSettings({ postPeakFillMode: value as PostPeakFillMode })}
        >
          <SelectTrigger id="settings-post-peak-fill-mode" data-testid="settings-post-peak-fill-mode">
            <SelectValue placeholder="Select when to fill" />
          </SelectTrigger>
          <SelectContent>
            {POST_PEAK_FILL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField
          testId="settings-post-peak-days"
          label="Days after peak"
          value={settings.postPeakDays}
          min={0}
          max={10}
          onCommit={(value) => updateSettings({ postPeakDays: value })}
        />
        <NumberField
          testId="settings-history-window"
          label="History window (cycles)"
          value={settings.historyWindow}
          min={1}
          max={12}
          onCommit={(value) => updateSettings({ historyWindow: value })}
        />
      </div>
    </div>
  )
}