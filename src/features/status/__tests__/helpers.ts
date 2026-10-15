/**
 * Where a line on the Status screen may not go: it must never count down to a Peak.
 *
 * A countdown is the one claim this method is defined against. Every line here is checked against
 * it: the cycle days elapsed since the user's own Peak reading, which is always retrospective, and
 * where to expect the next Peak, which now speaks about a Peak that has not happened yet and hedges
 * accordingly.
 *
 * This matches countdowns only. An earlier version also banned the bare phrases "next peak" and
 * "coming peak" as proxies for future-tense language. The Peak range does speak about the next Peak
 * now, so those two alternatives are gone — but "in N days" was never caught, and now is.
 *
 * One home, deliberately. This guard exists in three places at one point, drifted apart, and had to
 * be reconciled by hand when the wording it guards changed.
 */
export const COUNTDOWN =
  /\d+ days? (until|to|before|from now)|in \d+ days?|until (your |the )?peak|days? to (your |the )?peak|countdown|days? remaining/i;
