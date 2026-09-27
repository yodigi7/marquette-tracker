# Design

## Context

See `proposal.md` — Why for the motivation. The relevant current state:

- The three monitor readings are six CSS custom properties in `src/index.css`
  (`--fertility-monitor-{low,high,peak}`, once in `:root`, once in `.dark`). Token names are
  referenced from `src/lib/fertility-visuals.ts` and consumed by class name, so the values can be
  changed without touching a component.
- The Calendar paints the marker as a 10px circle inside a day cell that may already carry a phase
  fill, a post-calendar fill, or the forecast fill. The worst-case adjacent background in light
  mode is the "Fertile" fill `#fecdd3`; in dark mode it is the "Before" fill `#451a03`.
- The single-cycle Cycle chart paints the same tokens as full-height day bands.
- The multi-cycle comparison chart does **not** consume these tokens. It encodes readings with its
  own `MONITOR_OPACITIES` plus block height, added deliberately because opacity alone was judged
  too weak a channel. It is unaffected by this change and is the precedent for why a second,
  non-color channel is the durable answer to this class of problem.
- Existing tests assert class names (`bg-fertility-monitor-low`), never color values, so nothing
  pins the palette today.

## Goals / Non-Goals

**Goals**

- Make Low, High, and Peak mutually distinguishable at 10px, prioritising the reported Low-vs-Peak
  pair.
- Bring all six values into compliance with the 3:1 marker floor this change adds to
  `fertility-visuals`, including the pre-existing light-mode Low violation.
- Make the compliance check repeatable so the palette cannot drift back.

**Non-Goals**

- No new non-color cue on the Calendar. The dot-size idea from the issue stays a separate issue;
  the comparison chart's height encoding is the model if it is ever taken up.
- No change to marker shape, legend structure, accessible text, engine, or data model.
- No change to the mucus/intercourse/BBT overlay colors, which are a separate legibility problem
  (see Risks).

## Decisions

### D1 — Keep the issue's metaphor, discard its hex values

The issue proposed teal/orange/magenta and the owner approved that direction, but its literal values
fail the 3:1 floor: five of six fall below it, and dark-mode Low `#134e4a` sits at **1.58:1**,
which would have made the most common reading effectively invisible. The metaphor is kept because
it is approved and legible; the values are replaced because they are not implementable.

_Alternative:_ implement the issue verbatim. Rejected — it ships a near-invisible dot and
contradicts the spec.

### D2 — Choose for the reported pair, not the average

The search space was scored on Low-vs-Peak distance first, then the worst pair. This mattered: a
blue Low (`#2563eb`) gives a tidy cool/warm/hot lightness progression but only **1.25x** on the
reported pair, because blue and magenta are 63° apart. Teal (`#115e59`) gives **1.75x** on the same
pair, because teal and magenta are 135° apart. A lightness progression was explicitly not worth
1.75x on the pair the user actually complained about.

_Alternative:_ optimise the minimum pairwise distance. Rejected — it produced a traffic-light
blue/green/red palette that collided with the menses red and post-peak emerald already on screen.

### D3 — Accept that hue, not lightness, carries light mode

The 3:1 floor against `#fecdd3` forces every light-mode reading into a narrow dark band, so the
three cannot also be spread by lightness. Light mode therefore gets hue separation only; dark mode,
where there is contrast headroom, additionally gets a lightness progression. The proposal states
this rather than implying a progression that light mode does not have.

_Consequence to record:_ Low/High and High/Peak separation decrease slightly (0.93x and 0.81x) to
fund the Low/Peak gain. Low/High were already the well-separated pairs.

### D4 — Named Tailwind steps only

Every value is a Tailwind palette step (`teal-800`, `orange-700`, `fuchsia-600`, `teal-600`,
`orange-400`, `fuchsia-400`). `index.css` already uses Tailwind values throughout, so this keeps
the file consistent and makes the intent reviewable by name rather than by hex.

### D5 — Orange, not amber, for High

Amber is already the pre-fertile _status_ colour. Using amber for a raw reading would conflate a
data value with a derived status, so High is orange in both themes. This also avoids High being
byte-identical to the dark pre-fertile border `#fbbf24`.

### D6 — Encode the constraint in a test, not a comment

The regression test parses the six custom properties out of `index.css` and computes WCAG contrast
against every Calendar fill per theme. This is the only thing that stops the palette drifting back
out of compliance, which is how the current 2.90:1 violation survived. It asserts the _rule_, so
the palette stays editable; it does not pin the exact hex values.

### D7 — No second, non-colour channel on the Calendar

The comparison chart encodes readings by block height because it must be _scanned_ — you cannot
hover thirty bands to read each one. The Calendar answers a different question ("what did I read on
the 14th") and is hover-to-read, so it does not need the same affordance. The single-cycle strip
chart, which is the Calendar's closest sibling, also uses flat colour bands and no height encoding;
adding height to the Calendar alone would make it the odd one out.

The palette is therefore colour-dependent by design, and the `fertility-visuals` requirement is
already satisfied on its "non-colour cue **or** equivalent textual/legend cue" branch: the hover
tooltip names the reading, the day-detail surface shows it, the legend labels every entry, and the
day cell carries it in accessible text. A user who cannot separate the hues is slowed, not blocked.

Considered and rejected: varying dot size (shrinks Low, the most common reading and already the
tightest contrast in dark mode); a ring on Peak alone (makes Peak a different kind of mark rather
than more of the same); varying shape (fights the dot metaphor and the fixed legend footprint);
opacity (already rejected for the comparison chart, which found it degrades further for low vision
and in greyscale).

Owner decision, 2026-09-27: confirmed no.

## Assumptions

Load-bearing, in the order they were made. Each is reversible by editing six lines in
`src/index.css`.

1. **The approved metaphor outranks the issue's literal hex values.** Teal/orange/magenta is kept;
   the specific colours are not. _Why ambiguous:_ the issue named exact values, but they fail a
   spec requirement the issue did not account for. _Affects:_ what the user sees. _Reversible:_
   yes, and the PR asks for confirmation.
2. **The reported Low-vs-Peak pair outranks a tidy lightness progression.** _Why ambiguous:_ both
   are defensible readings of "more unique colors"; they conflict. _Affects:_ what the user sees;
   the chosen option is better on the reported bug and worse on a secondary metric. _Reversible:_
   yes.
3. **Light mode carries the progression by hue only, dark mode by hue and lightness.** _Why
   ambiguous:_ the issue claimed a lightness-based visual-weight progression in both themes, which
   the 3:1 floor makes impossible in light mode. _Affects:_ the design story, not the data.
   _Reversible:_ yes, by relaxing contrast, which the spec forbids.
4. **High uses orange rather than amber.** _Why ambiguous:_ the issue said "orange" but the
   existing dark High was already amber. _Affects:_ what the user sees; keeps data distinct from
   status. _Reversible:_ yes.
5. **The cycle-chart overlay legibility problem is out of scope.** Mucus, intercourse, and BBT
   markers are drawn on top of the monitor bands at roughly 1.05:1–1.89:1 for _every_ current
   colour, and in light mode no colour clears 3:1 against all of them. This is pre-existing,
   affects all readings equally, and cannot be fixed by recolouring the bands. _Affects:_ nothing
   in this change; recorded so it is not rediscovered as a regression here.
6. **Branch `agent/issue-24` created in the primary checkout.** The task stated a worktree and
   branch were already prepared; neither existed — the checkout was on `main` with no worktree.
   Since pushing to `main` is forbidden and a PR needs a branch, one was created following the
   existing `agent/issue-N` convention. _Routine_, but a deviation worth stating.
7. **The palette guard lives at `scripts/__tests__/fertility-palette.test.mjs`, not in `src/`.**
   _Why ambiguous:_ it asserts against `src/index.css`, so `src/lib/__tests__/` looked like the
   natural home, but reading the stylesheet needs `node:fs`, and `tsconfig.app.json` deliberately
   carries only `vite/client` types. A `?raw` CSS import is not a fallback: Vitest stubs CSS by
   default and returns an empty string, verified. The alternatives were adding Node types to the
   browser project, which weakens type safety app-wide, or reaching for a new dependency, against
   the project's discipline. `scripts/__tests__/` already holds `icons.test.mjs` for exactly this
   reason, so this follows existing precedent. _Affects:_ test placement only, not behaviour.
   _Routine._

## Risks / Trade-offs

- **Low/High and High/Peak get slightly closer** → Accepted deliberately; see D3. The pairs that
  regressed were already the strongest, and the reported pair improves 1.75x/2.06x.
- **Peak magenta sits near the mucus overlay magenta** → Accepted. The mucus marker is already
  invisible on the bands at any colour (see assumption 5), so avoiding the hue buys nothing, while
  the chart distinguishes them by shape (circle over rectangle) and by legend.
- **High orange sits ~0.10 OKLab from the menses red** → Accepted. They are different shapes in the
  same cell (circle vs bar), and the menses stripe already carries a shape cue. Flagged because it
  is the tightest remaining proximity.
- **A future palette edit could still regress** → Mitigated by D6.

## Migration Plan

None. No stored data, schema, or backup format changes; the change is presentational and applies
on next load. Rollback is reverting the six values.

## Open Questions

None. Both candidates were resolved by the owner on 2026-09-27:

- The non-colour cue question became **D7** (no second channel on the Calendar).
- The mucus/intercourse/BBT-on-band legibility gap was **explicitly deferred**, not overlooked. The
  owner chose to leave it alone for now, so it is recorded here as a deliberate deferral rather than
  an oversight should it resurface. It remains a pre-existing gap: the overlays sit on the monitor
  bands at roughly 1.05:1–1.89:1 for every colour, and in light mode no band colour clears 3:1
  against all of them, so it cannot be addressed by recolouring.
