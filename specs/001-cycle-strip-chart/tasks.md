---

description: "Task list for cycle strip chart feature (Milestone 6)"
---

# Tasks: Cycle Strip Chart (Milestone 6)

**Input**: Design documents from `/specs/001-cycle-strip-chart/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ (strip-model.md, cycle-strip-ui.md), quickstart.md

**Tests**: INCLUDED — the spec requests testable user stories (Independent Test per story) and Success Criteria SC-001..SC-005 ("`pnpm test` (incl. new)"), and the constitution (principle IV) is test-first. Tests are written red in `__tests__/` before their implementation tasks land (TDD).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3 — from spec.md)
- Include exact file paths in descriptions

## Path Conventions

- Single frontend project: `src/features/cycle-chart/**`, `docs/`, `README.md` at repo root
- Scope restriction (plan.md): `core/engine` MUST NOT be touched; no new dependencies; view is read-only (no store writes)
- Relative test docs: `specs/001-cycle-strip-chart/` (contracts, quickstart)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline so feature diffs are attributable.

- [X] T001 Run baseline gates on the current tree BEFORE any change: `pnpm test`, `pnpm lint`, `pnpm build` — all must stay green (baseline at M5). Record baseline pass; abort feature work if any gate is red. Command: `pnpm test && pnpm lint && pnpm build`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure derivation layer + shared test helpers that ALL user stories depend on. Mirrors `calendar/grid.ts` + `calendar/__tests__/calendar.test.tsx` conventions.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create the shared store-seeding test helper in `src/features/cycle-chart/__tests__/helpers.ts`: a `seedCycles()` that (a) resets the singleton store (`useAppStore.setState({ hydrated: false })`, `hydrate()`, `clearAllData()` — the `bootCurrentMonth` pattern from `src/features/calendar/__tests__/calendar.test.tsx`), then seeds **Cycle A** (closed, 28 days: menses day 1 via `bloodFlow`, `monitor: 'high'` day 8, `monitor: 'peak'` + `mucus: 'peak'` day 14, `bbt` on days 8..15 with day 12 bbt `null`, `intercourse: true` day 18) and **Cycle B** (open, records through `dayInCycle` 6) via `setNewCycle` + `addDayRecord`; and a `resetStore()` for empty-store tests. Expected numbers per `specs/001-cycle-strip-chart/quickstart.md` §"Component test fixture"
- [X] T003 [P] Write table-driven unit tests in `src/features/cycle-chart/__tests__/lib.test.ts` targeting the not-yet-existing `src/features/cycle-chart/lib.ts` (RED — module missing). Assert per `contracts/strip-model.md` §1 invariants 1–6: `days.length === span`; `span` = `length` for closed / `max(1, maxDayInCycle)` for open; per-day `status/source` copied verbatim from `CycleResult.days`; `window === null` iff algorithm disabled XOR no result; `window.source === 'confirmed'` iff `beginRule === 'first-high-or-peak'`; `open === (closedAt === null)`. Also §2 series extractors: `bbtSeries` drops `bbt == null` days, `mucusSeries` keeps stored `'none'`, `intercourseSeries` only `=== true`), empty arrays as `[]`; and `resolveSelectedCycle`: valid id wins, unknown/absent param falls back to newest cycle, `undefined` when no cycles
- [X] T004 [P] Implement `src/features/cycle-chart/lib.ts`: export types `StripDay { day; date; monitor?; mucus?; bbt: number|null; intercourse; status: DayStatus|null; source }`, `StripWindow { begin; end: number|null; source; beginRule; endRule }`, `StripModel { cycleId; cycleNo; day1; open; span; days; window: StripWindow|null }`; functions `buildStripModel(cycle, result, records, algorithmEnabled)`, `bbtSeries`, `mucusSeries`, `intercourseSeries`, and `resolveSelectedCycle(cycles, param)` — all per `contracts/strip-model.md` (invariants 1–6 quoted above verbatim in that doc). No React/Recharts/Dexie/DOM imports; no computation of fertile windows (window copied from `result.fertileWindow`) — makes T003 GREEN

**Checkpoint**: Foundation ready — `pnpm test` passes with the new `lib.test.ts`, and user story implementation can begin.

---

## Phase 3: User Story 1 - View a CBPM-style strip for one cycle (Priority: P1) 🎯 MVP

**Goal**: `CycleChartView` at `/cycle/:cycleId` renders a read-only horizontal strip: one band segment per cycle day colored by monitor reading (Low=sky / High=amber / Peak=violet, none=faint track), with the engine-computed fertile window drawn as a translucent rose `ReferenceArea` band (solid border when `source==='confirmed'`, dashed when `'predicted'`), empty-state CTA when no cycles exist, and NO window band when `algorithmEnabled === false` (FR-001..004, FR-009, FR-010; SC-001..004).

**Independent Test**: `pnpm test` runs `strip-chart.test.tsx` + `cycle-chart.test.tsx` — a seeded closed cycle yields `[data-testid="day-band"]` count === span with correct `data-day`/`data-monitor`, the sr-only `[data-testid="fertile-window-band"]` carries correct `data-begin`/`data-end`/`data-source` (and dashed `stroke-dasharray` in the SVG when predicted); with `algorithmEnabled: false` the band element is absent while day-bands remain; with an empty store the view renders `[data-testid="cycle-chart-empty"]` with a "Start a cycle" link and no console errors.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T005 [P] [US1] Write `src/features/cycle-chart/__tests__/strip-chart.test.tsx` rendering `StripChart` from hand-crafted `StripModel` fixtures (no IDB): assert day-band count === `span`, per-segment `data-day`/`data-monitor` attributes and band fill classes per `contracts/cycle-strip-ui.md` §3 (none⇒faint track, low⇒sky, high⇒amber, peak⇒violet); window band present via SR element with `data-source="confirmed"` for a `first-high-or-peak` model and `data-source="predicted"` + dashed border for a calendar-rule model; model with `window: null` renders NO band element (SC-002/003 sub-part)
- [X] T006 [P] [US1] Write `src/features/cycle-chart/__tests__/cycle-chart.test.tsx` view-level test using `helpers.ts`: seeded Cycle A ⇒ `day-band` count 28 and window band present (SC-001); `store().updateSettings({ algorithmEnabled: false })` then re-render ⇒ no `fertile-window-band` but day-bands remain (SC-003, FR-004); `resetStore()` ⇒ `[data-testid="cycle-chart-empty"]` + "Start a cycle" button rendered with no console errors (SC-004, FR-010). Uses the exact testid contract from `contracts/cycle-strip-ui.md` §3

### Implementation for User Story 1

- [X] T007 [US1] Implement `src/features/cycle-chart/strip-chart.tsx`: `StripChart({ model, showMucus, showBbt, showIntercourse })` (props defaulted `false` until US2) rendering a Recharts `ComposedChart` per `contracts/cycle-strip-ui.md` §2: numeric `XAxis` (domain `[0.5, span+0.5]`, day-number labels, `interval={0}`), monitor bands via `Bar` (constant y, fixed `barSize`, custom `shape` stamping `data-testid="day-band"` + `data-day` + `data-monitor`), window band via `ReferenceArea` with sr-only `data-testid="fertile-window-band"` span (`data-begin`/`data-end`/`data-source`) and `strokeDasharray` when predicted, translucent rose fill, wrapped in an `overflow-x-auto` container with `minWidth ~ span × 28px` (max 42×28). Recharts vendored primitives verified in `research.md` D1. Makes T005 GREEN
- [X] T008 [US1] Implement `src/features/cycle-chart/index.tsx` as `CycleChartView`: read `:cycleId` via `useParams`, resolve via `lib.resolveSelectedCycle(cycles, param)` (falls back to newest); `buildStripModel(cycle, cycleResultsByCycleId(output).get(cycle.id), dayRecords.filter(r => r.cycleId === cycle.id), settings.algorithmEnabled)`; render `<StripChart>` (overlay props `false`); when no cycles render empty-state (`[data-testid="cycle-chart-empty"]`, `Button asChild` → `Link to="/"` labelled "Start a cycle"); must NOT call any store write method (FR-009). Uses `useAppStore` selectors + `core/store/selectors.cycleResultsByCycleId` — makes T006 GREEN

**Checkpoint**: User Story 1 fully functional — strip, window band with confirmed/predicted styling, algorithm-off gating, empty-state. `pnpm test` green for T005/T006; this is the MVP.

---

## Phase 4: User Story 2 - Overlay optional signals (Priority: P2)

**Goal**: Toggleable overlays aligned to the same numeric day axis as the monitor strip: mucus marks (fuchsia ramp by level), BBT line on a right axis that **gaps** across unrecorded days (FR-006), and intercourse markers (teal); each toggle adds/removes its marks while the strip stays stable (FR-005..007, FR-010).

**Independent Test**: `pnpm test` runs `overlays.test.tsx` — with a crafted model, turning BBT on renders `[data-testid="overlay-bbt-point"]` only on recorded `bbt != null` days (a seeded null-BBT day has no marker), turning mucus/intercourse on renders their points at the exact `data-day`s, and turning each off removes its points while `day-band` count/attributes are unchanged.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US2] Write `src/features/cycle-chart/__tests__/overlays.test.tsx` rendering `StripChart` with a model containing sparse `bbt` (incl. a `null` day), mucus levels, and `intercourse` days: per `contracts/cycle-strip-ui.md` §3 assert `[data-testid="overlay-bbt-point"]`/`overlay-mucus-point`/`overlay-intercourse-point` appear (correct `data-day`/`data-level`) only when the matching prop is true, the null-BBT day is absent (gap — FR-006), and toggling a prop off removes its markers while the band count and window band stay identical (US2 acceptance 1–3; quickstart §"Component test fixture" item 7)

### Implementation for User Story 2

- [X] T010 [P] [US2] Extend `src/features/cycle-chart/strip-chart.tsx`: add BBT `Line` on `yAxisId="bbt"` right axis with `connectNulls={false}` (point list from `bbtSeries`), mucus `Scatter` (fuchsia-ramp markers per `data-level`), intercourse `Scatter` (teal markers), each rendered only when its `show*` prop is true and stamped with the §3 overlay testids; right axis hidden while BBT is off; left monitor axis hidden at all times (research D4/D5). Depends on T007. Makes T009 GREEN
- [X] T011 [P] [US2] Extend `src/features/cycle-chart/index.tsx`: add three overlay toggle controls (Mucus / Temperature (BBT) / Intercourse) using existing shadcn `Button`/`Switch`-style controls with ephemeral `useState` (default all off, per `data-model.md` §5 — not persisted in M6), wiring them into the `StripChart` `show*` props. Depends on T008 + T010

**Checkpoint**: User Stories 1 AND 2 work — overlays toggle independently, strip stable.

---

## Phase 5: User Story 3 - Select between cycles (Priority: P2)

**Goal**: A shadcn `Select` cycle selector lists cycles newest-first and switches the rendered strip via navigation (`/cycle/:cycleId`), with logical fallback to the newest cycle for absent/unknown ids (FR-008; US3 acceptance A1; research D6).

**Independent Test**: `pnpm test` runs `selector.test.tsx` — with two seeded cycles rendered under `MemoryRouter`, the selector lists newest first with labels of the form `Cycle N · starts MMM D, YYYY` (+ `(open)` marker) and ` · 29 days`, choosing the other cycle navigates and re-renders `day-band` for that cycle; visiting an unknown/absent id falls back to the newest cycle (quickstart §"Component test fixture" item 6, SC: no cross-contamination).

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [US3] Write `src/features/cycle-chart/__tests__/selector.test.tsx` rendering `CycleChartView` inside `MemoryRouter` with helpers.ts seeding Cycle A + B: assert `[data-testid="cycle-selector"]` (shadcn Select trigger) lists the newest cycle first with the label format above and an `(open)` suffix for Cycle B; selecting Cycle A changes the location and the `day-band` count to 28 (Cycle B strip to 6); render at `/cycle/bogus` and `/cycle` ⇒ falls back to Cycle B's strip (US3 acceptance A1 + spec Edge Case "no cross-contamination")

### Implementation for User Story 3

- [X] T013 [US3] Extend `src/features/cycle-chart/index.tsx`: replace the static display with a shadcn `Select` (from `src/components/ui/select.tsx`) whose items are cycles **newest-first** labelled `Cycle N · starts {month} {day}, {year}{closedAt===null ? ' (open)' : ''} · {span} days`, value bound to the current `:cycleId`, and `onValueChange` → `useNavigate(\`/cycle/${id}\`)`; keep `resolveSelectedCycle` fallback for absent/unknown ids. Depends on T008/T011. Makes T012 GREEN

**Checkpoint**: All user stories independently functional — selector deep-links, swaps strips, no cross-contamination.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Milestone close-out per constitution "Toolchain gates" + archiving convention.

- [X] T014 [P] Archive the milestone: create `docs/MILESTONE_6_CYCLE_STRIP_CHART.md` mirroring the format of `docs/MILESTONE_5_CALENDAR.md` — files, behavior spec (strip/bands/window/overlays/selector), test matrix, Definition of Done checklist — consistent with `IMPLEMENTATION_PLAN.md` §6.3
- [X] T015 [P] Update `README.md` status section: mark Milestone 6 (Cycle strip chart) complete with updated total test count, note Milestone 7 (History/Stats) is next; keep the medical disclaimer line unchanged
- [X] T016 Run the full gates on the finished feature: `pnpm test`, `pnpm lint` (oxlint), `pnpm build` (tsc -b + vite) — fix any failures; capture the new test totals. Command: `pnpm test && pnpm lint && pnpm build`
- [ ] T017 Run the manual PWA validation from `specs/001-cycle-strip-chart/quickstart.md` §"Manual validation": `pnpm dev` — load `/cycle` (falls back to newest seeded cycle) and browse via the in-view cycle selector; verify strip bands (left→right day 1→N, sky/amber/violet) and dashed predicted window band, overlay toggles (marks add/remove, strip unchanged), deep links to two seeded cycle ids plus invalid-id fallback, phone-width horizontal scroll with no overflow, keyboard/tab + focus-visible sweep on selector/toggles, light and dark themes legible; FR-004 (algorithm OFF) is automated (skip; Settings UI is M7); then `pnpm build && pnpm preview` offline reload (service worker) still renders the chart

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 verifies baseline first
- **Foundational (Phase 2)**: Depends on T001 — BLOCKS all user stories (lib.ts + helpers used everywhere)
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - US1 (P1) → US2 (P2) → US3 (P2), sequential in priority order
  - US2 edits `strip-chart.tsx`/`index.tsx` after US1 lands
  - US3 extends `index.tsx` after US1/US2 land
- **Polish (Phase 6)**: Depends on US1..US3 complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P2)**: Requires US1's `strip-chart.tsx`/`index.tsx` (extends the same files) — independently testable via its own `overlays.test.tsx`
- **User Story 3 (P2)**: Requires US1's `index.tsx`; independent of US2 — independently testable via `selector.test.tsx`

### Within Each User Story

- Tests are written FIRST and FAIL before implementation (TDD; constitution IV)
- Pure lib/series layer before rendering; rendering before view shell; integration last
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 2: T002, T003, T004 can all run together ([P]) — helpers, tests, and lib.ts are separate files; lib.ts must match the fixed `contracts/strip-model.md` API the tests assert against
- US1: T005 + T006 (two test files) in parallel, then T007 + T008 (separate files)
- US2: T010 + T011 together (different files) once T009 tests exist
- US3: T013 after T012
- Polish: T014 + T015 in parallel, then T016, then T017

---

## Parallel Example: User Story 1

```bash
# Launch both US1 test files together (TDD red):
Task: "Write strip-chart.test.tsx in src/features/cycle-chart/__tests__/ (testid day-band / fertile-window-band contract)"
Task: "Write cycle-chart.test.tsx in src/features/cycle-chart/__tests__/ (seeded fixture, algorithm-off, empty-state)"

# Then implementation (files don't overlap):
Task: "Implement StripChart in src/features/cycle-chart/strip-chart.tsx"
Task: "Implement CycleChartView shell in src/features/cycle-chart/index.tsx"
```

```bash
# User Story 2 (files don't overlap with US1's, but both extend existing files):
Task: "Extend strip-chart.tsx with BBT Line / mucus Scatter / intercourse Scatter"
Task: "Extend index.tsx with overlay toggle controls"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: T001 baseline gates
2. Complete Phase 2: T002–T004 (lib + helpers + tests) — CRITICAL, blocks everything
3. Complete Phase 3: US1 (T005–T008) → **STOP and VALIDATE** `pnpm test` (SC-001..004 green)
4. Deploy/demo if ready — strip + window band + algorithm-off + empty state is the MVP

### Incremental Delivery

1. Setup + Foundational → foundation ready (`lib.test.ts` green)
2. US1 → read-only strip chart → **MVP** (deployable/demoable)
3. US2 → overlays toggle on/off → demo
4. US3 → cycle selector → full view
5. Polish → archive + README + full gates + manual PWA QA (Milestone 6 done)

### Parallel Team Strategy

With multiple developers:

1. T001 baseline, then Team splits Phase 2 ([P] trio)
2. Once Foundation is done: Developer A → US1; after US1, Developer B takes US2 while Developer C takes US3
3. All stories keep their own `__tests__/` files; no shared-file overlap except the two feature files (serialize US2/US3 edits after US1)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- Do NOT touch `core/engine/**` (engine purity, constitution III) — this feature is zero-engine-risk
- Do NOT add dependencies (constitution V) — Recharts + existing shadcn kit only
- Commit after each task or logical group; update `specs/001-cycle-strip-chart/` docs only if the contract shifts
- Stop at any checkpoint to validate the story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence