# AGENTS.md — `src/core/engine/`

Guidance for AI agents working in this directory. Read before making changes.

This is the **pure** Marquette engine. It imports nothing framework-specific: no React, no Dexie, no
browser API. That constraint is what makes it unit-testable and portable to Python later, so a change
that breaks it is a regression even if the app still works. Everything here is derived at read time
from raw records and never persisted.

Protocol rules below are the **authoritative** statement of the Marquette cycling algorithm. When code
and these rules disagree, one of them is a bug — determine which, do not quietly reconcile them.

## Contents

| File            | Role                                                           |
| --------------- | -------------------------------------------------------------- |
| `types.ts`      | Domain types shared with the rest of the app                   |
| `marquette.ts`  | The protocol engine: windows, statuses, protocol warnings      |
| `predict.ts`    | Forecasting from the lookback                                  |
| `projection.ts` | Projected (future) cycles, which compute their own window      |
| `placement.ts`  | Where a cycle's days land relative to the calendar             |
| `dateUtils.ts`  | Date arithmetic helpers                                        |
| `engineSdk.ts`  | The seam the app consumes; keep it narrow                      |
| `__tests__/`    | Table-driven tests. Required for any change in this directory. |

## Marquette domain rules (cycling protocol — the core logic)

Source: Marquette University College of Nursing, Institute for NFP (Fehring et al.). Used for women with cycles 21–42 days.

Markers: monitor reading (Low / High / Peak), optional cervical mucus (L/H/P style), BBT, intercourse acts, menses.

Fertile-window **begin**:

|                | Rule                                                                                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cycles 1–6     | Fertility begins on **cycle day 6** (calendar rule, reflects earliest possible peak day 12 − 6)                                                                                                                                                                |
| After 6 cycles | Earliest **Peak day** of the last 6 cycles **minus 6 days** — where a cycle's Peak day is its **first** monitor Peak reading — AND the first High or Peak reading of the current cycle triggers the fertile window whenever it appears (whichever comes first) |

The begin **day** is day 6 in both rows above, but the begin **rule** is not the same one: the
earliest-Peak-minus-6 rule applies only when the history window actually holds a Peak to measure from.
A cycle beyond the first six whose window holds none falls back to the day-6 rule and is labelled as
that fallback, so a surface naming the rule names the rule that was applied.

Fertile-window **end**:

|                  | Rule                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any cycle number | 3 full (24-h) days after the **last user-entered monitor Peak of that same cycle**                                                                                                                                |
| No monitor Peak  | No end. The protocol defines the end only through a Peak, so a cycle holding none has no end day, in every cycle including cycles beyond the first six, and every day from the window's begin onward is `fertile` |

- Monitor-only evidence: Peak, fertile-window begin/end, and confirmation come from user-entered monitor readings. Mucus stays loggable and visible (calendar/chart overlays) but is never engine evidence.
- **A cycle holds two Peak days, not one.** The monitor is specified to show Peak for a **minimum of 2 days** (Fehring 2013: "at a minimum the monitor usually will give the user at least one day of 'high' fertility and two days of 'peak' fertility"), and ovulation falls inside "the 2 days of CPFM peak fertility" in 91.1% of cycles (Fehring 2008). The protocol uses a different reading for each end of the window: the **first** Peak reading is the cycle's _Peak day_, and the **last** is what the end is measured from. Never collapse the pair, and never report a last reading as "the Peak day".
- **The end is never earlier than the Peak day that defines it.** The end is measured from the cycle's own monitor Peak and from no other reading, so a cycle 7+ whose Peak is later than every Peak in the last 6 still ends three days after its own Peak. No date borrowed from another cycle may shorten it, in either direction. The symmetric invariant holds on the other side: the begin is never later than the cycle's own first Peak day, because the first High **or Peak** reading of the current cycle opens the window whenever it precedes the calendar day. Both are asserted by tests, not by prose.
- **Recorded evidence never moves the window.** If a monitor `high`/`peak` is logged on a day after the computed end, that contradiction is _reported_ as a protocol warning, not resolved by moving the end. `low` outside the window is consistent and is not reported. The window opens on evidence (first High or Peak before the calendar begin pulls it earlier) and closes on the Peak alone — the two halves deliberately differ, because the published protocol defines the end only through the last Peak.
- **An open cycle whose computed end has passed is reported.** The cycle is still in progress, so its remaining days are not settled. A closed cycle with an end in the past is ordinary.
- **A cycle with no Peak (8–10% of cycles) has no end, in every cycle** — and the app raises a `no-peak-end` protocol warning saying so, so the absence is explained rather than silent. It is not a defect and no substitute end is invented.
- **A run of 9 or more consecutive monitor `high` readings is reported** as a `high-run` protocol warning naming the run's length: that is the point at which the monitor's own guidance is to stop testing, because a Peak is no longer expected. A `peak` reading ends the run, as does any cycle day that is not a `high` (an unlogged day is not a `high`). The run is an observation only — it is never treated as a Peak and never moves `begin`, `end`, or either rule.
- The post-Peak interval is a **fixed protocol constant of 3**, not a preference. The published protocol ends the window "three full days past the last peak reading" (Mu, Fehring & Bouchard, _Linacre Q_ 2022; Fehring 2018), so it is not user-configurable and no stored value can move it. Do not reintroduce a `postPeakDays` setting.
- Cycles outside 21–42 days: warn if 2+ cycles fall outside the band (protocol says consult a teacher).
- All computed statuses are **derived at read time** from raw records — never stored — recomputed on every data change.
- **Projected cycles compute their own window.** A projection has no readings, so its window is the calendar rule over the lookback's Peaks, with each edge taken from the reading its own rule uses: begin = earliest **Peak day** (first reading) − 6, end = latest **last** Peak reading + 3. With no Peak anywhere in the lookback it uses a composed fallback — begin day 6, end day 16, being the earliest possible Peak day (12) plus the minimum Peak run (2 days, so the earliest possible _last_ Peak day is 13) plus the post-Peak interval. That fallback is for projections only and is never applied to a cycle the user recorded.

## Working in this directory

- **Tests first.** Any change here ships with a table-driven test in `__tests__/`, written before the fix. `pnpm test` must be green.
- **No framework imports.** React, Dexie, `window`, `document`, `localStorage`, and any browser API are all out. If you need one, the logic belongs outside this directory and takes plain data in.
- **No `any`.** Strict TypeScript throughout; the engine is the strictest surface in the project because it is the part meant to be ported.
- **Never store a computed value.** Statuses, windows, and warnings are recomputed on every read. Adding a field that caches a derived result reintroduces the staleness the whole design avoids.
- **Protocol warnings are observations, not corrections.** The engine reports a contradiction (`high`/`peak` after the computed end, a long `high` run, a missing Peak); it never bends a window to make the data consistent.
