# Marquette Tracker

Offline-first PWA for tracking a woman's fertility cycle using the **Marquette Method** with the **ClearBlue Fertility Monitor (CBPM)**. Logs daily observations, computes the fertile window per the Marquette Institute algorithm, and provides predictions/forecasting.

See [AGENTS.md](./AGENTS.md) for full project context, decisions, and domain rules, and [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) (plus [docs/MILESTONE_1_SCAFFOLD.md](./docs/MILESTONE_1_SCAFFOLD.md)) for roadmap.

## Stack

Vite 8 · React 19 · TypeScript 6 (strict) · Tailwind CSS v4 · shadcn/ui (Radix) · Zustand · Dexie (IndexedDB) · Recharts · Vitest · vite-plugin-pwa

## Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Local dev server (Vite) |
| `pnpm test` | Run Vitest test suite (engine tests required for any `core/engine` change) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm build` | Type-check + production build (PWA: SW + manifest) |
| `pnpm preview` | Preview the production build (verify offline behavior) |
| `pnpm lint` | Oxlint |

## Project layout

```
src/
  app/           # App shell: router, layout, providers
  components/    # Shared UI (shadcn/ui in components/ui, lib/utils)
  core/engine/   # Pure, framework-agnostic Marquette algorithm (M2)
  core/store/    # Zustand stores + Dexie repositories (M3)
  features/      # today / calendar / cycle-chart / history / settings
```

## Status

Milestone 1 (scaffold) complete: toolchain, shadcn/ui, PWA shell, routing skeleton, Vitest harness.
Milestone 2 (Marquette engine + tests) is next.

## Medical disclaimer

This application is an aid/support tool, not a medical device. Fertility interpretation should be verified with a Marquette-certified instructor.