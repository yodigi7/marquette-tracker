import type { DayStatus, FertileWindow } from "@/core/engine/types";
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

export function windowDescription(window: FertileWindow, peakKnown: boolean): string {
  const begin = `Fertile from cycle day ${window.begin} (${BEGIN_RULE_LABELS[window.beginRule]})`;
  if (window.end === null) {
    return peakKnown
      ? `${begin}; end pending new readings after Peak.`
      : `${begin}; end unknown until a Peak is read.`;
  }
  return `${begin}; until day ${window.end} (${endRuleLabel(window.endRule)}).`;
}
