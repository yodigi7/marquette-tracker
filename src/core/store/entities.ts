import type { DateKey, Goal, Theme } from "@/core/engine/types";

/** Sync/version bookkeeping attached to every row (AGENTS.md sync-ready path). */
export interface SyncMeta {
  version: number;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CycleEntity extends SyncMeta {
  id: string;
  day1: DateKey;
  cycleNo: number;
  closedAt: DateKey | null;
  notes: string;
  /** Declared via "Start a new cycle": day1 always opens a cycle during placement. */
  pinned?: boolean;
}

export interface DayRecordEntity extends SyncMeta {
  id: string;
  cycleId: string;
  date: DateKey;
  dayInCycle: number;
  monitor?: "none" | "low" | "high" | "peak";
  mucus?: "none" | "low" | "high" | "peak";
  bloodFlow?: "none" | "light" | "medium" | "heavy";
  intercourse?: boolean;
  intercourseTime?: string;
  bbt?: number | null;
  symptoms?: string[];
  pregnancyTest?: "negative" | "positive";
  notes?: string;
}

export type WeekStart = "monday" | "sunday";
export type CalendarDetailMode = "simple" | "full";

/**
 * The Calendar's hideable visual layers, in legend order. The union is derived
 * from the tuple so the recognised set has exactly one source of truth: the
 * settings row stores ids from this list, and a stored id that is no longer in
 * it is discarded rather than treated as an error.
 */
export const CALENDAR_LAYER_IDS = [
  "before",
  "fertile",
  "after",
  "predicted",
  "menses",
  "low",
  "high",
  "peak",
  "intercourse",
] as const;

export type CalendarLayerId = (typeof CALENDAR_LAYER_IDS)[number];

/** True when `value` names a layer this build recognises. */
export function isCalendarLayerId(value: unknown): value is CalendarLayerId {
  return CALENDAR_LAYER_IDS.includes(value as CalendarLayerId);
}

/**
 * Keeps only recognised ids, so a preference written by another version cannot
 * leave the app holding a layer it cannot render. A display preference must
 * never be the reason a stored record cannot be read.
 */
export function normalizeCalendarLayerIds(value: unknown): CalendarLayerId[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isCalendarLayerId);
}

export interface SettingsEntity extends SyncMeta {
  key: "main";
  goal: Goal;
  algorithmEnabled: boolean;
  historyWindow: number;
  theme: Theme;
  weekStart: WeekStart;
  cycleMinLength: number;
  cycleMaxLength: number;
  overlayMucus: boolean;
  overlayBbt: boolean;
  overlayIntercourse: boolean;
  calendarDetailMode: CalendarDetailMode;
  /** Calendar visual layers the user has hidden. Absent means nothing is hidden. */
  hiddenCalendarLayers: CalendarLayerId[];
  /** Project future cycles on the Calendar. Off by default; see cycle-projection. */
  projectFutureCycles: boolean;
  /** TEMPORARY: one-shot marker so demo data is loaded only on first startup. */
  demoSeeded: boolean;
}

export const SETTINGS_KEY = "main" as const;

export const DEFAULT_SETTINGS: Omit<SettingsEntity, keyof SyncMeta> = {
  key: SETTINGS_KEY,
  goal: "track-only",
  algorithmEnabled: true,
  historyWindow: 6,
  theme: "system",
  weekStart: "monday",
  cycleMinLength: 21,
  cycleMaxLength: 42,
  overlayMucus: false,
  overlayBbt: false,
  overlayIntercourse: false,
  calendarDetailMode: "simple",
  hiddenCalendarLayers: [],
  projectFutureCycles: false,
  demoSeeded: false,
};
