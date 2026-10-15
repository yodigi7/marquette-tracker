# Scope decisions

The rules that keep this project small — including what it has deliberately ruled out. Read before adding
a feature, a dependency, or a data path.

Three decisions are hard enough that the code alone misleads about them. Those carry their reasoning in
[`adr/`](./adr/).

## Data and storage

- **Local storage only.** Everything lives in IndexedDB in the browser. No cloud sync, no backend, no
  encryption. The schema stays sync-ready (UUID keys, version flags) for a later layer.
- **Versioned JSON backup and restore are in scope** for local data protection, and the storage schema
  must stay migration-ready.
- **CSV is a separate, low-priority, read-only export** for spreadsheets. It is not a backup and cannot be
  imported. See [ADR-0003](adr/0003-json-backup-and-csv-are-separate-formats.md).
- **No generated document files.** The app never writes a PDF, PNG, or similar. Both printables are handed
  to the browser's own print action. See [ADR-0002](adr/0002-no-generated-document-files.md).

## Monitoring

- **Monitor readings are entered by hand.** No device integration and no import path.
- **The algorithm is on by default**, with a user-facing toggle that puts the app in logging-only mode.
- **Normal cycling protocol only.** No postpartum, non-cycling, or transitioning rules.
- **Current Marquette Institute protocols** (Fehring et al.). The rules live in
  [`src/core/engine/AGENTS.md`](../src/core/engine/AGENTS.md), not here.

## Scope

- **Personal use** — mine and my partner's. Opening it up to other users is not MVP scope.
- **No reminders or notifications.** Nothing is scheduled or pushed.
- **No Python backend in MVP**, deferred entirely. The engine stays pure TS so the logic can be ported
  later for parity. See [ADR-0004](adr/0004-pure-engine-for-a-later-python-port.md).
- **The post-Peak interval is a fixed protocol constant**, not a preference. There is no setting for it
  and no stored value can move it.
- **Day 1 is the first day of menses.** Not a decision to revisit; a definition, recorded in
  [`GLOSSARY.md`](../GLOSSARY.md).

## Working practices

- **YAGNI.** Implement what the ticket says, no more.
- **Dependencies are minimal.** No new dependency without telling me first.
- **pnpm, not npm.** The lockfile, the hooks, and CI assume pnpm.
