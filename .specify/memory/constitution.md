# Marquette Tracker Constitution

Durable, non-negotiable principles distilled from `AGENTS.md`. AGENTS.md is the authoritative source; amend both together when a principle changes.

## Core Principles

### I. Marquette-Method Correctness
The product implements the Marquette Method of NFP as taught by the Marquette University College of Nursing Institute for NFP (Fehring et al.): **current cycling protocols only** (cycles 21–42 days), Day 1 = first day of menses, normal cycling only (no postpartum/non-cycling/transitioning rules in MVP). The algorithm is **on by default** but MUST have a user-facing toggle to disable all computed fertile-window logic (the app then logs data without interpreting it). All computed statuses are **derived at read time** from raw records — never stored — and recomputed on every data change. A medical disclaimer is required: support tool, not a medical device; recommend verification with a Marquette-certified instructor.

### II. Offline-First, Local-Only, Sync-Ready
The app is an offline-first PWA. IndexedDB (via Dexie) is the **single source of truth**; no cloud sync, no encryption, no backend in MVP. The schema MUST stay sync-ready for the future: UUID keys and `version`/`synced`/`createdAt`/`updatedAt` flags on every entity. Store → engine imports are allowed one direction only; never the reverse.

### III. Pure, Portable Engine
`core/engine` is framework-agnostic TypeScript: it MUST NOT import React, Dexie, or any browser API. It must stay portable so it can be ported to Python/FastAPI later with logic parity. No `enum`, no `namespace` (`erasableSyntaxOnly`); `import type` for type-only imports (`verbatimModuleSyntax`); no `any` (strict).

### IV. Test-First for the Engine
Any change touching `core/engine` requires table-driven Vitest tests first, run with `npm run test` (all suites must stay green). The engine is the heart of the product; correctness is non-negotiable and cheap to protect in a trivia table.

### V. Minimal Dependencies
Hobby-project discipline: no new dependency without the user's awareness. Prefer shadcn/ui + Tailwind; keep the dependency set as lean as decided in the stack table.

## Scope Constraints (MVP)

- **Fully digital** — no printed chart, no PDF/CSV export in MVP (JSON backup may come later).
- **Manual entry only** for monitor readings — no device integration/import.
- **No reminders/notifications** for now.
- Multi-user, cloud sync, Python backend, export — all deferred, but the data model/algorithm must not paint us into a corner.

## Technology Stack (locked)

| Concern | Choice |
|---|---|
| Framework | Vite + React + TypeScript (strict) |
| PWA | `vite-plugin-pwa` |
| UI | shadcn/ui + Tailwind CSS (light/dark) |
| State | Zustand |
| Local DB | IndexedDB via Dexie (UUID keys, sync-ready flags) |
| Charts | Recharts |
| Tests | Vitest (jsdom default; `// @vitest-environment node` per-file for the pure engine) |
| Backend | None in MVP (deferred FastAPI) |
| Package manager | pnpm |

## Marquis Milestone Workflow / Quality Gates

- Feature code lives in `src/features/**`; shared UI in `src/components/ui` (prefer shadcn).
- Toolchain gates before a milestone is "done": `pnpm test`, `pnpm lint` (oxlint), `pnpm build` all green; README status line updated.
- Milestones are tracked as spec-kit features under `specs/`; completed milestones 1–5 remain archived as docs under `docs/`.

## Governance

- This constitution supersedes nothing in AGENTS.md — AGENTS.md remains authoritative.
- Spec-kit plans/tasks MUST pass the gates above (engine purity, offline-first, derived-at-read-time, disclaimer, dependency discipline) before implementation.
- The `/speckit.plan` Constitution Check gate verifies these before Phase 0; re-check after design.

**Version**: 1.0 | **Ratified**: 2026-09-24 | **Last Amended**: 2026-09-24