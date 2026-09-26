import type { DayStatus, FertileWindow } from "@/core/engine/types";

/**
 * Status for a single cycle day, derived from the computed window.
 *
 * A status exists for any day inside a cycle, whether or not the day holds a
 * record: the window decides, not the record list.
 */
export function dayInfo(window: FertileWindow, peakKnown: boolean, day: number): DayStatus {
  if (day < window.begin) {
    return "pre-fertile";
  }
  if (window.end === null || day <= window.end) {
    return "fertile";
  }
  return peakKnown ? "post-peak" : "post-calendar";
}
