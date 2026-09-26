import { useTheme } from "next-themes";
import { useAppStore } from "@/core/store/useAppStore";
import type { Theme } from "@/core/engine/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeSection() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const { setTheme } = useTheme();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="settings-theme">Theme</Label>
      <Select
        value={settings.theme}
        onValueChange={(value) => {
          const theme = value as Theme;
          setTheme(theme);
          updateSettings({ theme });
        }}
      >
        <SelectTrigger id="settings-theme" data-testid="settings-theme">
          <SelectValue placeholder="Choose a theme" />
        </SelectTrigger>
        <SelectContent>
          {THEME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
