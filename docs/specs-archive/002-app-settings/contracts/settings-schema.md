# Contract — Settings Record (persisted schema + derived engine settings)

Interface between the Settings view and the persistence/engine layers. Consumers reference this contract; the store hydrates it and maps it to `EngineSettings`.

## `SettingsEntity` (store row, `key: 'main'`)

```ts
interface SettingsEntity extends SyncMeta {
  key: 'main'
  goal: 'avoid-pregnancy' | 'achieve-pregnancy' | 'track-only'   // default 'track-only'
  algorithmEnabled: boolean                                       // default true
  postPeakDays: number                                            // int, 0-10, default 3
  historyWindow: number                                           // int, 1-12, default 6
  theme: 'light' | 'dark' | 'system'                              // default 'system'

  weekStart: 'monday' | 'sunday'                                  // NEW, default 'monday'
  cycleMinLength: number                                          // NEW, int 15-60, default 21
  cycleMaxLength: number                                          // NEW, int 15-60, default 42, min < max
  overlayMucus: boolean                                           // NEW, default false
  overlayBbt: boolean                                             // NEW, default false
  overlayIntercourse: boolean                                     // NEW, default false

  demoSeeded: boolean                                             // dev-only marker (TODO(remove-after-dev))
}
```

- Writes go through `updateSettings(patch)`; the key is fixed at `'main'`.
- Missing row at boot hydrates to `DEFAULT_SETTINGS`.
- All reads are reactive via `useAppStore` selectors.

## Derived `EngineSettings` (pure engine input)

```ts
interface EngineSettings {
  postPeakDays: number      // stored value
  historyWindow: number     // stored value
  cycleMinLength: number    // stored value (defaults 21)
  cycleMaxLength: number    // stored value (defaults 42)
}
```

`engineSettingsOf(SettingsEntity)` maps the row → these five fields. `CYCLE_LENGTH_MIN`/`CYCLE_LENGTH_MAX` remain exported from `marquette.ts` as the engine's defaults and the UI's pre-fill values.

## Validation (enforced in the Settings UI before any write)

| field | rule |
|---|---|
| `postPeakDays` | integer 0–10 |
| `historyWindow` | integer 1–12 |
| `cycleMinLength`, `cycleMaxLength` | integer 15–60 and `cycleMinLength < cycleMaxLength` |

Invalid input shows inline feedback and is never written.

## Clear-all-data semantics

`clearAllData()` (existing) deletes Cycle/DayRecord/Settings rows, then rehydrates defaults. After a wipe the app is empty; charts/Today/History render empty states. The wipe leaves `demoSeeded: true` so a reload does not re-seed sample data (dev-only marker).