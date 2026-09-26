import { useAppStore } from "@/core/store/useAppStore";
import type { Goal } from "@/core/engine/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "./number-field";

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "track-only", label: "Track only" },
  { value: "avoid-pregnancy", label: "Avoid pregnancy" },
  { value: "achieve-pregnancy", label: "Achieve pregnancy" },
];

export function CoreSection() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

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

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="settings-project-future-cycles">
            Project future cycles on the calendar
          </Label>
          <p className="text-sm text-stone-500">
            Off = only the current cycle is shown. On = projected cycles, their expected period
            days, and their fertile windows are drawn ahead on the calendar.
          </p>
        </div>
        <Switch
          id="settings-project-future-cycles"
          data-testid="settings-project-future-cycles"
          checked={settings.projectFutureCycles}
          onCheckedChange={(checked) => updateSettings({ projectFutureCycles: checked })}
        />
      </div>

      <NumberField
        testId="settings-history-window"
        label="History window (cycles)"
        value={settings.historyWindow}
        min={1}
        max={12}
        onCommit={(value) => updateSettings({ historyWindow: value })}
      />
    </div>
  );
}
