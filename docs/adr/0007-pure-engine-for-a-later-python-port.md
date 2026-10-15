# Pure engine for a later Python port

`src/core/engine` imports nothing framework-specific — no React, no Dexie, no browser API — and takes
plain data in at a narrow seam. The MVP has no backend and needs none of this today.

The algorithm is the part that must stay bit-identical if it is ever reimplemented, and a pure module
ports to Python by translation rather than by rewrite. The constraint also does its immediate job: it
keeps every protocol rule unit-testable without a DOM or a database, which is most of why the engine's
table-driven tests are cheap to write.

A future reader looking at a strict no-framework rule with no present-day caller for it should assume the
rule is deliberate. The awkwardness it creates — passing plain values across the seam instead of reaching
for a store hook — is the feature, not an oversight to be tidied away.
