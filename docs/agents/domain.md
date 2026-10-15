# Domain Docs

How the skills consume this repo's domain documentation.

## Before exploring, read these

- [`GLOSSARY.md`](../../GLOSSARY.md) at the repo root.
- [`docs/adr/`](../adr/): read any ADR touching the area you are about to work in.

If either is empty or missing, **proceed silently**. Don't flag the absence; don't suggest creating them
upfront. `@domain-modeling` creates them lazily when a term or a decision actually gets resolved.

## Use the glossary's vocabulary

When your output names a domain concept — an issue title, a refactor proposal, a hypothesis, a test name —
use the term as defined in `GLOSSARY.md`. Don't drift to the synonyms it avoids.

If the concept you need isn't there, that's a signal: either you're inventing language the project doesn't
use (reconsider), or there's a real gap (note it for `@domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0002 (the Status Peak range looks forward), but worth reopening because…_
