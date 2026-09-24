# Quickstart — App Settings & Preferences

Validation guide: prove the feature works end-to-end. Models/contracts referenced, not duplicated. See [data-model.md](./data-model.md), [contracts/settings-schema.md](./contracts/settings-schema.md), [contracts/settings-ui.md](./contracts/settings-ui.md).

## Prerequisites

- `pnpm install` (or existing node_modules).
- Dev build with demo seeding active (M6/M7 seeded sample data is present; it is the normal dev state).
- TESTS FIRST, implementation second (engine change): the suite in §4.1 below is written and green before the `EngineSettings` change lands.

## Setup

```bash
pnpm dev          # http://localhost:5173; demo data seeds on first boot
pnpm test         # full suite (Vitest); at minimum the paths in §4
pnpm build        # strict tsc + PWA build sanity
```

## Scenarios

### S1 — Core preferences persist and affect behavior (US1/FR-001..003)

1. `/settings` → change Post-peak days to `5`, History window to `8`.
2. **Expected**: inputs accept values; `settings-post-peak-days` = 5, `settings-history-window` = 8; no inline errors.
3. Confirm engine consumption: `/calendar` and Cycle strip fertile windows/peaks endpoints shift +3→+5 days vs default; forecast band uses the 8-cycle window.
4. Reload the page. **Expected**: both values remain (persisted Dexie row).
5. Invalid entry check: Post-peak days → `-1` and `11`. **Expected**: inline error, value not written (reload restores last valid).

### S2 — Algorithm toggle (constitution-mandated, FR-002)

1. `/settings` → turn `settings-algorithm` **off**.
2. `/calendar` and `/` (Today). **Expected**: no fertile-window shading / status interpretation — logging-only UI; raw monitor/mucus readings still visible. Predictions labeled "predicted" disappear (no computed windows).
3. Toggle on. **Expected**: computed windows return.

### S3 — Clear all data (FR-009..011, SC-004)

1. Note pre-wipe state (cycles > 0 in `/history`).
2. `/settings` → `settings-clear-data` → dialog opens; `settings-clear-execute` is **disabled** until `settings-clear-ack` checked.
3. Ack + execute. **Expected**: dialog closes; `/history` empty state; `/today` no records; `/settings` shows **defaults** (goal track-only, algorithm on, peak 3, window 6, week-start Monday, band 21–42, overlays off, theme system).
4. Reload. **Expected**: still empty — demo data did **not** re-seed (FR-009; `demoSeeded` gate).

### S4 — Week start (FR-004)

1. `/settings` → `settings-week-start` = `sunday`.
2. `/calendar`. **Expected**: grid columns Su–Sa with day 1 of each cycle in the correct column; month label/length unchanged.
3. Toggle back to `monday`. **Expected**: original layout restored.

### S5 — Cycle-length band (FR-006, SC-002)

1. `/settings` → band min = `24`, max = `39`.
2. **Expected**: values accepted (24–39 ⊂ 15–60, min < max).
3. Open `/history` (or Cycle strip) with the cycle of length outside new band. **Expected**: out-of-band warning now keyed to 24–39 (a 23-day cycle warns; a 22-day cycle that previously… did not — verified in the engine band tests, §4.1).
4. Inversion check: min `40`, max `24`. **Expected**: inline error, not written.

### S6 — Chart overlay persistence (FR-005, SC-003)

1. `/history` → open a cycle strip → toggle mucus + BBT overlays on.
2. Navigate away and back (strip re-mounts). **Expected**: overlays **stay on** (persisted via `updateSettings`).
3. `/settings`. **Expected**: `settings-overlay-mucus` and `settings-overlay-bbt` switches reflect on.

### S7 — Theme live (US1/theme)

1. `/settings` → theme = `dark`. **Expected**: root gets dark class immediately (next-themes) — UI renders dark; stays after reload.
2. theme = `system`. **Expected**: follows OS preference.

## Automated verification

```bash
pnpm test            # entire suite green
pnpm test -- core/engine    # all engine cases (existing 24 + new band table) green
pnpm lint            # no new warnings (pre-existing shadcn fast-refresh warnings OK)
pnpm build           # strict tsc + PWA build green
```

### 4.1 Test-first engine cases (before `EngineSettings` change)

- Default preservation: default settings ⇒ band warning + forecast identical to current `CYCLE_LENGTH_MIN/MAX` behavior.
- Boundary: length == min / == max in-band; min−1 / max+1 flagged out-of-band (warning + excluded from forecast filter).
- Shifted band: [24,39] flags 23 and 40, accepts 24–39; forecast filter respects the window.
- Inverted/protocol cases: min ≥ max rejected at UI layer (engine trusts validated row).