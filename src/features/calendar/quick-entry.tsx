import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore, FutureDateError } from "@/core/store/useAppStore";
import type { DayRecordEntity } from "@/core/store/entities";
import { todayKey } from "@/core/dateKeys";
import {
  convertToCelsius,
  formatForDisplay,
  rangeHint,
  unitLabel,
  validateBbt,
} from "@/core/temperature";

type MonitorValue = NonNullable<DayRecordEntity["monitor"]>;
type MucusValue = NonNullable<DayRecordEntity["mucus"]>;
type FlowValue = NonNullable<DayRecordEntity["bloodFlow"]>;

const MONITOR_OPTIONS: { value: MonitorValue; label: string }[] = [
  { value: "none", label: "—" },
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
  { value: "peak", label: "Peak" },
];

const MUCUS_OPTIONS: { value: MucusValue; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "L" },
  { value: "high", label: "H" },
  { value: "peak", label: "P" },
];

const FLOW_OPTIONS: { value: FlowValue; label: string }[] = [
  { value: "none", label: "None" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

interface QuickEntryProps {
  cycleId: string;
  date: string;
  dayInCycle: number;
  existing?: DayRecordEntity;
  onSaved(): void;
}

export function QuickEntry({ cycleId, date, dayInCycle, existing, onSaved }: QuickEntryProps) {
  const settings = useAppStore((state) => state.settings);
  const unit = settings.temperatureUnit;
  const [monitor, setMonitor] = useState<MonitorValue>(existing?.monitor ?? "none");
  const [mucus, setMucus] = useState<MucusValue>(existing?.mucus ?? "none");
  const [flow, setFlow] = useState<FlowValue>(existing?.bloodFlow ?? "none");
  // The stored value is always Celsius; the field holds whatever the user reads.
  const [bbt, setBbt] = useState<string>(
    existing?.bbt != null ? formatForDisplay(existing.bbt, unit) : "",
  );
  const [bbtWarning, setBbtWarning] = useState<string | null>(null);
  // The unit the field's current text is written in, so a preference change
  // while the dialog is open can re-express the reading instead of leaving a
  // number on screen that now means something else.
  const [previousUnit, setPreviousUnit] = useState(unit);
  if (unit !== previousUnit) {
    setPreviousUnit(unit);
    setBbt((current) => {
      const trimmed = current.trim();
      return trimmed === ""
        ? current
        : formatForDisplay(convertToCelsius(Number(trimmed), previousUnit), unit);
    });
    setBbtWarning(null);
  }
  const [intercourse, setIntercourse] = useState<boolean>(existing?.intercourse ?? false);
  const [intercourseTime, setIntercourseTime] = useState<string>(existing?.intercourseTime ?? "");
  const [pregnancy, setPregnancy] = useState<string>(existing?.pregnancyTest ?? "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [symptomInput, setSymptomInput] = useState("");

  function addSymptom() {
    const value = symptomInput.trim();
    if (value && !symptoms.includes(value)) {
      setSymptoms([...symptoms, value]);
    }
    setSymptomInput("");
  }

  /**
   * Resolves the typed temperature to a canonical Celsius value, or reports why
   * it cannot be stored. `skipWarning` is set by the "Save anyway" path so the
   * user is not asked about the same reading twice.
   */
  function resolveBbt(skipWarning: boolean): number | null | "invalid" | "confirm" {
    if (bbt.trim() === "") {
      return null;
    }
    const typed = Number(bbt);
    const verdict = validateBbt(typed, unit);
    if (verdict.kind === "ok") {
      return convertToCelsius(typed, unit);
    }
    if (verdict.kind === "confirm") {
      if (skipWarning) {
        return convertToCelsius(verdict.value, unit);
      }
      setBbtWarning(verdict.message);
      return "confirm";
    }
    setBbtWarning(verdict.message);
    return "invalid";
  }

  async function save(skipWarning = false) {
    const bbtValue = resolveBbt(skipWarning);
    if (bbtValue === "invalid" || bbtValue === "confirm") {
      // Keep the dialog open with the value still in the field so it can be
      // corrected. Nothing is written.
      return;
    }
    try {
      await useAppStore.getState().addDayRecord(cycleId, date, dayInCycle, {
        monitor: monitor === "none" ? undefined : monitor,
        mucus: mucus === "none" ? undefined : mucus,
        bloodFlow: flow === "none" ? undefined : flow,
        bbt: bbtValue,
        intercourse,
        intercourseTime: intercourse ? intercourseTime || undefined : undefined,
        symptoms,
        pregnancyTest: pregnancy === "" ? undefined : (pregnancy as "negative" | "positive"),
        notes: notes || undefined,
      });
    } catch (error) {
      if (error instanceof FutureDateError) {
        toast(error.message);
        return;
      }
      throw error;
    }
    toast(`${date} saved`);
    onSaved();
  }

  async function remove() {
    if (!existing) {
      return;
    }
    await useAppStore.getState().removeDayRecord(existing.id);
    toast(`${date} deleted`);
    onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log {date === todayKey() ? "today" : date}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1 block">Monitor reading</Label>
          <div className="flex gap-1">
            {MONITOR_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={monitor === opt.value ? "default" : "outline"}
                size="sm"
                aria-pressed={monitor === opt.value}
                onClick={() => setMonitor(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block">Mucus</Label>
            <div className="flex gap-1">
              {MUCUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={mucus === opt.value ? "default" : "outline"}
                  size="sm"
                  aria-pressed={mucus === opt.value}
                  onClick={() => setMucus(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Blood flow</Label>
            <Select value={flow} onValueChange={(v) => setFlow(v as FlowValue)}>
              <SelectTrigger data-testid="bloodflow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLOW_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block">BBT ({unitLabel(unit)})</Label>
            <Input
              type="number"
              step={unit === "f" ? "0.1" : "0.01"}
              placeholder={unit === "f" ? "97.7" : "36.5"}
              data-testid="bbt"
              aria-describedby="bbt-hint"
              value={bbt}
              onChange={(e) => {
                setBbt(e.target.value);
                setBbtWarning(null);
              }}
            />
            <p id="bbt-hint" data-testid="bbt-hint" className="mt-1 text-xs text-stone-500">
              {rangeHint(unit)}. Outside that you can still save it if the reading is real.
            </p>
            {bbtWarning && (
              <div
                data-testid="bbt-warning"
                role="alert"
                className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900"
              >
                <p>{bbtWarning}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    data-testid="bbt-save-anyway"
                    onClick={() => void save(true)}
                  >
                    Save anyway
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="bbt-keep-editing"
                    onClick={() => setBbtWarning(null)}
                  >
                    Keep editing
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <Label className="mb-1 block">Pregnancy test</Label>
            <Select value={pregnancy} onValueChange={setPregnancy}>
              <SelectTrigger data-testid="pregnancy">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <input
              id="intercourse"
              type="checkbox"
              checked={intercourse}
              onChange={(e) => setIntercourse(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="intercourse">Intercourse</Label>
            {intercourse && (
              <Input
                type="time"
                className="ml-auto w-28"
                value={intercourseTime}
                onChange={(e) => setIntercourseTime(e.target.value)}
              />
            )}
          </div>
        </div>

        <div>
          <Label className="mb-1 block">Symptoms</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. cramps"
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSymptom()}
            />
            <Button type="button" variant="outline" onClick={addSymptom}>
              Add
            </Button>
          </div>
          {symptoms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {symptoms.map((s) => (
                <span key={s} className="rounded bg-stone-100 px-2 py-0.5 text-xs">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="mb-1 block">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else…"
            className="resize-none"
          />
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        {existing && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="delete-record"
            onClick={() => void remove()}
          >
            Delete
          </Button>
        )}
        <div className={cn("flex gap-2", !existing && "ml-auto")}>
          <Button type="button" onClick={() => void save()}>
            Save
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
