# Contract — Settings UI

Interface between the user and the Settings screen (`/settings`). TestId-based, matching the house pattern (`data-testid` selectors used by component tests).

## Screen layout

`SettingsView` renders three sections, in order:

1. **Core settings** — goal (select), algorithm toggle (switch), post-peak days (number input), history window (number input).
2. **Display & protocol** — theme (select: system/light/dark), week start (select: monday/sunday), cycle band (min/max number inputs), chart overlays (three switches: mucus / BBT / intercourse).
3. **Danger zone** — Clear all data.

## Controls & testIds

| control | testId | behavior |
|---|---|---|
| Goal select | `settings-goal` | `value=goal`; on change `updateSettings({goal})` |
| Algorithm switch | `settings-algorithm` | `checked=algorithmEnabled`; toggles `updateSettings({algorithmEnabled})` |
| Post-peak days input | `settings-post-peak-days` | validates int 0–10; on valid change `updateSettings({postPeakDays})` |
| History window input | `settings-history-window` | validates int 1–12; on valid change `updateSettings({historyWindow})` |
| Theme select | `settings-theme` | `value=theme`; on change `updateSettings({theme})` + next-themes persist |
| Week start select | `settings-week-start` | `value=weekStart`; on change `updateSettings({weekStart})` |
| Cycle min input | `settings-cycle-min` | validates int 15–59 < max; on valid change `updateSettings({cycleMinLength})` |
| Cycle max input | `settings-cycle-max` | validates int 16–60 > min; on valid change `updateSettings({cycleMaxLength})` |
| Overlay: mucus switch | `settings-overlay-mucus` | toggles `updateSettings({overlayMucus})` |
| Overlay: bbt switch | `settings-overlay-bbt` | toggles `updateSettings({overlayBbt})` |
| Overlay: intercourse switch | `settings-overlay-intercourse` | toggles `updateSettings({overlayIntercourse})` |
| Clear-data button | `settings-clear-data` | opens confirmation dialog |
| Confirm dialog | `settings-clear-confirm` | child controls: `settings-clear-ack` (checkbox), `settings-clear-execute` (destructive button, disabled until ack) |

## Clear-all-data flow

```
settings-clear-data ─click─► dialog opens
  ├─ settings-clear-ack (checkbox, unchecked)
  │    describe: deletes every cycle, day record, and resets settings to defaults
  └─ settings-clear-execute (disabled until ack=true)
        ─click─► clearAllData(); dialog closes; whole app rehydrated empty (defaults)
```

- Cancelling (scrim / Escape / close) leaves data intact.
- After execution the Settings screen shows default values; Today/Calendar/History/Cycle chart render empty states.
- No confirmation on ordinary setting changes.

## Cross-view integration (read side)

| view | reads |
|---|---|
| Today status card | `algorithmEnabled` (off → logging-only panel) |
| Calendar | `algorithmEnabled` (shading off) + `weekStart` (grid alignment) |
| Cycle strip | `algorithmEnabled`; overlay initial state + live toggles from `overlayMucus/overlayBbt/overlayIntercourse` |
| Chart band warning & forecast | `cycleMinLength/cycleMaxLength` via `EngineSettings` |

Persisted toggles in the strip write `updateSettings` on change, so the chart and Settings never diverge (chart re-renders on settings change — existing dependency).