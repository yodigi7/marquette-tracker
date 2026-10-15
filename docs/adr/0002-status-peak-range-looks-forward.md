---
status: accepted
---

# The Status Peak range looks forward

The line under the Status summary that reports the expected Peak-day range was deliberately written as a
retrospective statement about history. It carried no prediction word at all. That was a considered choice,
not an oversight: a wrong Peak prediction is costlier than a wrong period prediction, because a Peak day
is the one the whole method hangs on. A prediction that misses it can leave a user distrusting a reading
that was correct.

This reverses that choice. The line now looks forward, hedged — it predicts the next Peak falls around a
range of cycle days, naming the completed cycles the range rests on. The hedge does the work: the line
never counts down to a single named day, and the word "around" keeps the claim at a range rather than a
date. The line is labelled Predicted, because it is the app's estimate and not a reading.

The hedge is the whole safety argument, so it is load-bearing. If the line ever loses "around", it has
stopped being a safe prediction and has started being a wrong promise with extra steps.

Two limits on the hedge, stated so nobody re-derives them wrongly:

- It does not actually prevent a bare single day. When every cycle in the lookback agrees, the line reads
  "around cycle day 15" — the day is bare, and only the word "around" hedges it. Earlier notes on this
  decision described the line as never naming an unhedged day; that is stronger than what the code does.
- It does not survive being paraphrased into a title or a badge, which have no room for a hedge.

Recorded from the reversal described in issue #56; the prose rationale lives in the function comment on
`expectedPeakRangeLine`.
