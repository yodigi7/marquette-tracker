import type { DayStatus, EngineWarning, FertileWindow } from "@/core/engine/types";
import { FERTILITY_STATUS_VISUALS } from "@/lib/fertility-visuals";
import { dayInCycle, dateKeyLocal, parseDateKey, todayKey } from "@/core/dateKeys";

export { dayInCycle, dateKeyLocal, parseDateKey, todayKey };

// The Calendar's phase vocabulary, so both surfaces name a status the same way.
// No label asserts safety: a day status is derived from the window and the cycle
// day alone, so a day holding a monitor `high` can still resolve post-window.
export const STATUS_LABELS: Record<DayStatus, string> = {
  "pre-fertile": "Before",
  fertile: "Fertile",
  "post-peak": "After (post-peak)",
  "post-calendar": "After (by calendar)",
};

export const STATUS_TONES: Record<DayStatus, string> = {
  "pre-fertile": FERTILITY_STATUS_VISUALS["pre-fertile"].badge,
  fertile: FERTILITY_STATUS_VISUALS.fertile.badge,
  "post-peak": FERTILITY_STATUS_VISUALS["post-peak"].badge,
  "post-calendar": FERTILITY_STATUS_VISUALS["post-calendar"].badge,
};

export const BEGIN_RULE_LABELS: Record<FertileWindow["beginRule"], string> = {
  "calendar-day-6": "calendar rule (cycle day 6)",
  "calendar-earliest-peak-minus-6": "earliest Peak − 6 days",
  "first-high-or-peak": "first High or Peak reading",
};

export const END_RULE_LABELS: Record<FertileWindow["endRule"], string> = {
  "current-peak-plus-n": "current monitor Peak + 3 days",
  "historic-peak-plus-n": "latest historical Peak + 3 days",
  "earliest-end": "earliest of historical vs current Peak",
  "protocol-default-band": "protocol default band (no Peak history)",
  none: "no end (no Peak yet)",
};

/** The post-Peak interval is a protocol constant, so the rule text carries the value. */
export function endRuleLabel(rule: FertileWindow["endRule"]): string {
  return END_RULE_LABELS[rule];
}

/**
 * Wording for the two reconciliation warnings. Each describes the user's own recorded readings
 * and what the computed window said — never error, invalid, or malfunction language, and never a
 * disclaimer.
 */
export const WARNING_LABELS: Record<
  Extract<EngineWarning["kind"], "monitor-evidence-outside-window" | "open-cycle-past-window-end">,
  string
> = {
  "monitor-evidence-outside-window": "Monitor reading outside the computed window",
  "open-cycle-past-window-end": "Cycle still in progress",
};

/**
 * Text for the most relevant reconciliation warning on a cycle, or null when it has none.
 *
 * The cycle day is named explicitly because the warning belongs to the cycle while this view is
 * date-selectable: someone looking at cycle day 8 still needs to learn their day-15 reading
 * conflicts. `windowEnd` comes from the caller rather than the warning, because the engine
 * deliberately reports only the cycle and the day — the window is the caller's to look up.
 *
 * Evidence outranks still-in-progress: it is the sharper contradiction.
 */
export function warningBanner(warnings: EngineWarning[], windowEnd: number | null): string | null {
  for (const warning of warnings) {
    if (warning.kind === "monitor-evidence-outside-window") {
      const end = windowEnd === null ? "an undetermined day" : `day ${windowEnd}`;
      return `${WARNING_LABELS[warning.kind]}. Your monitor shows High or Peak on cycle day ${warning.day}, but the computed window ended on ${end}. The window has not changed.`;
    }
  }
  for (const warning of warnings) {
    if (warning.kind === "open-cycle-past-window-end") {
      const end = windowEnd === null ? "an undetermined day" : `day ${windowEnd}`;
      return `${WARNING_LABELS[warning.kind]}. The computed window ended on ${end}, and this cycle has not closed yet.`;
    }
  }
  return null;
}

export function windowDescription(window: FertileWindow, peakKnown: boolean): string {
  const begin = `Fertile from cycle day ${window.begin} (${BEGIN_RULE_LABELS[window.beginRule]})`;
  if (window.end === null) {
    return peakKnown
      ? `${begin}; end pending new readings after Peak.`
      : `${begin}; end unknown until a Peak is read.`;
  }
  return `${begin}; until day ${window.end} (${endRuleLabel(window.endRule)}).`;
}
