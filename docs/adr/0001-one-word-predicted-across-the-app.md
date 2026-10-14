# One word — Predicted — across the whole app

The app previously spoke three near-synonym words for anything the engine worked out about a day that
has not happened yet. The calendar legend said **Predicted**, the screen reader said _projected_ for
those same days, the History panel said **Forecast**, and Settings said **Project**. They differ in
how the engine arrived at the value, not in what the app is telling the user — so a user moving
between screens met three words for one idea and had to work out which one a given screen meant.

From issue #56 all three collapse to **Predicted**. The distinction is real but it is a distinction
about provenance, and the user cannot act on it: every predicted day on every screen makes the same
claim, that the day has not happened and the app is guessing. One word says that once, unambiguously.

The distinction survives in the code, where it is the boundary between two genuinely different
algorithms — computing a forward value from past cycles, and synthesising a whole cycle shape so
future days are not blank. The engine deliberately keeps the precise names (`Forecast`,
`projection.ts`, `predict.ts`). **The app's voice is one word; the code's is three.** A reader who
finds `Forecast` in the engine and `Predicted` in the UI should read this rather than assume the
rename was left half-finished.

## Consequences

Qualifiers appear only where there is room for them. Tight surfaces — the legend key, the History
panel heading, the Settings toggle — carry the single word. Prose and screen-reader announcements
carry the full form: _predicted period start_, _predicted fertile window day_. These are the short
and long forms of one term, never a fourth word.

Two consequences follow from the collapse. The History panel loses the sense of "this is a computed
report" that _Forecast_ carried, which is the price paid. And the printables' promise — that nothing
on them is a prediction — still holds, because the instructor documents exclude both kinds of guess
and are left saying so in the ordinary way. See
[ADR 0002](./0002-status-peak-range-looks-forward.md) for the one place this forced a guard to be
rewritten rather than merely satisfied.
