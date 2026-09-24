# Data Model — App Settings & Preferences

The feature reads and mutates one persisted row (the existing single settings row) and adds two numeric fields to the pure engine's settings type. No new tables, no new entities; `Cycle`/`DayRecord` are unaffected except by the clear-all-data destructive action.

All persisted entities are owned by `core/store/entities.ts`, hydrated by `useAppStore` (Dexie/IndexedDB). Sync metadata (`version/synced/createdAt/updatedAt`) rides on the row (constitution II).

## 1. Settings row — `SettingsEntity` (extended)

`export interface SettingsEntity extends SyncMeta { key: 'main' ... }`. New fields added in-place; existing fields untouched.

| field | type | default | persisted in | consumed by |
|---|---|---|---|---|
| `key` | `'main'` | `'main'` | — | `useAppStore` `keyOf`/settings row |
| `goal` | `Goal` | `'track-only'` (shipped M3 default) | — | future UI copy; stored only (YAGNI, no UI change) |
| `algorithmEnabled` | `boolean` | `true` | — | Today status card, Calendar shading, Cycle strip interpretation (constitution-mandated toggle) |
| `postPeakDays` | `number` (int) | `3` | — | `EngineSettings.postPeakDays`; fertile-window end |
| `historyWindow` | `number` (int) | `6` | — | `EngineSettings.historyWindow`; calendar-rule peaks + forecast |
| `theme` | `Theme` | `'system'` | — | `providers.tsx` `<ThemeProvider>` mode |
| **`weekStart`** | `'monday' \| 'sunday'` | `'monday'` | — | `calendar/grid.ts` labels + week slicing, Calendar view |
| **`cycleMinLength`** | `number` (int) | `21` | — | `EngineSettings.cycleMinLength`; band warning + forecast filter |
| **`cycleMaxLength`** | `number` (int) | `42` | — | `EngineSettings.cycleMaxLength`; band warning + forecast filter |
| **`overlayMucus`** | `boolean` | `false` | — | Cycle strip overlay `showMucus` initial state + toggle |
| **`overlayBbt`** | `boolean` | `false` | — | Cycle strip overlay `showBbt` initial state + toggle |
| **`overlayIntercourse`** | `boolean` | `false` | — | Cycle strip overlay `showIntercourse` initial state + toggle |
| `demoSeeded` | `boolean` | `false` | — | `providers.tsx` seed gate (`TODO(remove-after-dev)`) |

**Bold = added by this feature.** `DEFAULT_SETTINGS` in `entities.ts` is extended with exactly the bolded fields. The row is write-through (`updateSettings(patch: Omit<Partial<SettingsEntity>, 'key'>)` already exists; the feature only supplies richer patches).

## 2. Derived engine settings — `EngineSettings` (extended)

`core/engine/types.ts` — pure type add:

```ts
export interface EngineSettings {
  postPeakDays: number            // existing
  historyWindow: number           // existing
  cycleMinLength: number          // NEW (default 21)
  cycleMaxLength: number          // NEW (default 42)
}
```

Mapping lives in `useAppStore.engineSettingsOf(settings)` (adds the two fields). `CYCLE_LENGTH_MIN`/`CYCLE_LENGTH_MAX` stay exported from `marquette.ts` as the numeric defaults the UI pre-fills; consumers now read them from the settings object instead of importing the constants:
- `engineSdk.ts` cycle-band warning (record length outside `[min, max]` → `cycleFlags`).
- `predict.ts` forecast band filter (`lengths.filter(l => l >= cycleMinLength && l <= cycleMaxLength)`).

Behavior with default settings is identical to today.

## 3. Validation rules (FR-001 → UI enforcement, store trusts the settings row)

| field | rule | failure UX |
|---|---|---|
| `postPeakDays` | integer 0–10 | inline error, not persisted |
| `historyWindow` | integer 1–12 | inline error, not persisted |
| `cycleMinLength` / `cycleMaxLength` | integer 15–60, `min < max` | inline error + guidance, not persisted |

## 4. State transitions

```
Settings row (never deleted except by clear-all-data):
  write  ──updateSettings(patch)──►  row' (Synicmeta.updatedAt bumped by repo)
  Hydration: row missing at boot → DEFAULT_SETTINGS fallback (existing hydrate path)

Destructive path (FR-009/FR-010/FR-011):
  Danger zone: "Clear all data" → confirm dialog (type-to-confirm gate)
    ── clearAllData() (existing) ──►  repos.clearAll() deletes Cycle + DayRecord + Settings rows
        → refresh() rehydrates → DEFAULT_SETTINGS (defaults restored)
        → demoSeeded stays true (set by wipe) so next boot does not re-seed (FR-009)
        → all charts/Today/History render empty (derived-at-read-time: consistent)
```

Note: wiping does NOT touch browser PWA caches or the installed app; nothing in this feature touches the service worker.

## 5. Consumers of the changed types

| file | change |
|---|---|
| `core/engine/types.ts` | `EngineSettings` +2 fields |
| `core/engine/marquette.ts` | export-of-defaults retained; rule functions read fields from settings param |
| `core/engine/engineSdk.ts` | band warning via settings fields |
| `core/engine/predict.ts` | band filter via settings fields |
| `core/store/entities.ts` | `SettingsEntity` +5 fields; `DEFAULT_SETTINGS` |
| `core/store/useAppStore.ts` | `engineSettingsOf` mapping |
| `features/settings/*` | new view + sections |
| `features/calendar/grid.ts` `index.tsx` | `weekStart` |
| `features/cycle-chart/index.tsx` | overlay initial state + persistence via `updateSettings` |
| `app/providers.tsx` | `<ThemeProvider>` wiring + `demoSeeded` seed gate |

## 6. Affected tests (must stay green / be extended)

- `core/engine/*.test.ts` — add table-driven band cases (default-preserved + boundary + shifted band). **Written before the engine change** (constitution IV).
- `features/calendar/*.test.tsx` — week-start rendering (existing Monday case + Sunday case).
- `features/cycle-chart/*.test.tsx` — overlay initial state from settings; toggle persists.
- `features/settings/*.test.tsx` — new: each control writes the right settings field; numeric validation; clear-all-data confirmation + store emptied + defaults restored; algorithm toggle flips Today/Calendar.