// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { BeginRule, EndRule, Forecast } from "@/core/engine/types";
import {
  BEGIN_RULE_LABELS,
  END_RULE_LABELS,
  STATUS_LABELS,
  WARNING_LABELS,
  endRuleLabel,
  expectedPeakRangeLine,
  peakCountLine,
  windowDescription,
  warningBanner,
} from "../lib";

const RULES: EndRule[] = [
  "current-peak-plus-n",
  "lookback-latest-peak-plus-n",
  "protocol-fallback-window",
  "none",
];

describe("endRuleLabel", () => {
  it("names the fixed three-day interval in the rules that measure from a Peak", () => {
    expect(endRuleLabel("current-peak-plus-n")).toBe(END_RULE_LABELS["current-peak-plus-n"]);
    expect(endRuleLabel("lookback-latest-peak-plus-n")).toBe(
      END_RULE_LABELS["lookback-latest-peak-plus-n"],
    );
  });

  it("names whose Peak each rule measures from, so the two are not read as one", () => {
    expect(endRuleLabel("current-peak-plus-n")).toMatch(/this cycle/i);
    expect(endRuleLabel("lookback-latest-peak-plus-n")).not.toMatch(/this cycle/i);
    expect(endRuleLabel("lookback-latest-peak-plus-n")).toMatch(/recent cycles/i);
  });

  it("gives every end rule distinct text", () => {
    const labels = RULES.map((rule) => endRuleLabel(rule));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never leaves an N placeholder in any rule label", () => {
    for (const rule of RULES) {
      expect(endRuleLabel(rule)).not.toContain("N days");
    }
  });

  it("keeps rules that carry no day count unchanged", () => {
    expect(endRuleLabel("protocol-fallback-window")).toBe(
      END_RULE_LABELS["protocol-fallback-window"],
    );
    expect(endRuleLabel("none")).toBe(END_RULE_LABELS.none);
  });

  it("hard-codes no cycle-length band, which the fallback window is not", () => {
    // The old value was a hand-written 21 that read as a band floor. The composed window is a
    // calendar window, so no label may quote a number the rules did not produce.
    for (const rule of RULES) {
      expect(endRuleLabel(rule)).not.toMatch(/\b21\b|\b42\b/);
    }
  });
});

describe("BEGIN_RULE_LABELS", () => {
  it("distinguishes the first-cycle day-6 rule from the day-6 fallback", () => {
    expect(BEGIN_RULE_LABELS["calendar-day-6"]).toBe("calendar rule (cycle day 6)");
    expect(BEGIN_RULE_LABELS["calendar-day-6-fallback"]).not.toBe(
      BEGIN_RULE_LABELS["calendar-day-6"],
    );
    // Same day, different reason: the fallback says there was nothing to measure from.
    expect(BEGIN_RULE_LABELS["calendar-day-6-fallback"]).toMatch(/no Peak history/i);
  });

  it("gives every begin rule distinct text", () => {
    const rules: BeginRule[] = [
      "calendar-day-6",
      "calendar-day-6-fallback",
      "calendar-earliest-peak-minus-6",
      "first-high-or-peak",
    ];
    const labels = rules.map((rule) => BEGIN_RULE_LABELS[rule]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("STATUS_LABELS", () => {
  it("uses the Calendar's phase vocabulary", () => {
    expect(STATUS_LABELS["pre-fertile"]).toBe("Before");
    expect(STATUS_LABELS.fertile).toBe("Fertile");
    expect(STATUS_LABELS["post-peak"]).toBe("After (post-peak)");
    expect(STATUS_LABELS["post-calendar"]).toBe("After (by calendar)");
  });

  it("keeps the two post-window statuses distinguishable from each other", () => {
    expect(STATUS_LABELS["post-peak"]).not.toBe(STATUS_LABELS["post-calendar"]);
  });

  it("asserts no safety in any label", () => {
    for (const label of Object.values(STATUS_LABELS)) {
      expect(label).not.toMatch(/safe/i);
    }
  });
});

describe("windowDescription", () => {
  const window = {
    begin: 6,
    end: 17,
    beginRule: "calendar-day-6",
    endRule: "current-peak-plus-n",
  } as const;

  it("describes the fixed interval in the window line", () => {
    expect(windowDescription(window, true)).toBe(
      `Fertile from cycle day 6 (calendar rule (cycle day 6)); until day 17 (${END_RULE_LABELS["current-peak-plus-n"]}).`,
    );
  });

  it("explains a pending or unknown end without a day count", () => {
    expect(windowDescription({ ...window, end: null, endRule: "none" }, true)).toBe(
      "Fertile from cycle day 6 (calendar rule (cycle day 6)); end pending new readings after Peak.",
    );
    expect(windowDescription({ ...window, end: null, endRule: "none" }, false)).toBe(
      "Fertile from cycle day 6 (calendar rule (cycle day 6)); end unknown until a Peak is read.",
    );
  });

  it("names the rule behind every finite window end", () => {
    // The two post-window statuses must stay tellable apart, which means the line
    // has to carry the rule that produced the end — not just the status label.
    for (const rule of RULES.filter((r) => r !== "none")) {
      // peakKnown only affects the undetermined-end branch, so it is irrelevant here.
      const line = windowDescription({ ...window, end: 17, endRule: rule }, true);
      expect(line).toContain(END_RULE_LABELS[rule]);
    }
  });

  it("gives the two rules that measure from a Peak distinct text", () => {
    const byThisPeak = windowDescription(
      { ...window, end: 17, endRule: "current-peak-plus-n" },
      true,
    );
    const byHistory = windowDescription(
      { ...window, end: 17, endRule: "lookback-latest-peak-plus-n" },
      false,
    );

    expect(byThisPeak).not.toBe(byHistory);
    expect(byThisPeak).toContain(END_RULE_LABELS["current-peak-plus-n"]);
    expect(byHistory).toContain(END_RULE_LABELS["lookback-latest-peak-plus-n"]);
  });

  it("carries no rule name when the end is undetermined", () => {
    const pending = windowDescription({ ...window, end: null, endRule: "none" }, true);
    expect(pending).not.toContain(END_RULE_LABELS.none);
  });
});

describe("warningBanner", () => {
  const evidence = { kind: "monitor-evidence-outside-window", cycleNo: 1, day: 15 } as const;
  const inProgress = { kind: "open-cycle-past-window-end", cycleNo: 1 } as const;
  const noPeak = { kind: "no-peak-end", cycleNo: 1 } as const;
  const run = { kind: "high-run", cycleNo: 1, run: 9 } as const;

  it("names the reading, the offending cycle day, and the computed window end", () => {
    const banner = warningBanner([evidence], 13)!;

    expect(banner).toContain("cycle day 15");
    expect(banner).toContain("day 13");
    expect(banner).toMatch(/high or peak/i);
  });

  it("states that the window has not changed", () => {
    expect(warningBanner([evidence], 13)).toMatch(/has not changed/i);
  });

  it("describes an unfinished cycle as still in progress", () => {
    const banner = warningBanner([inProgress], 13)!;

    expect(banner).toMatch(/still in progress/i);
    expect(banner).toContain("day 13");
  });

  it("prefers the evidence warning when a cycle has both", () => {
    expect(warningBanner([inProgress, evidence], 13)).toBe(warningBanner([evidence], 13));
  });

  it("reports a cycle with no Peak as unresolved, without a referral or a fault", () => {
    const banner = warningBanner([noPeak], null)!;

    expect(banner).toMatch(/no monitor Peak reading/i);
    expect(banner).toMatch(/unresolved/i);
    // Factual, and nothing beyond it: no instruction to see anyone, no claim a device misbehaved.
    expect(banner).not.toMatch(/invalid|error|malfunction|fault|incorrect/i);
    expect(banner).not.toMatch(/disclaimer|medical advice|consult (a|your|with)/i);
  });

  it("reports a run of High readings with its length and the monitor's own guidance", () => {
    const banner = warningBanner([run], null)!;

    expect(banner).toMatch(/\b9\b/);
    expect(banner).toMatch(/stop testing/i);
    // The run is never presented as a Peak.
    expect(banner).not.toMatch(/peak reading/i);
  });

  it("names the run's length, not a fixed one", () => {
    expect(warningBanner([{ kind: "high-run", cycleNo: 1, run: 12 }], null)).toMatch(/\b12\b/);
  });

  it("gives both observations when a peakless cycle also has a long run", () => {
    // A run of Highs is the reason a cycle has no Peak, so reporting either alone would hide a fact.
    const banner = warningBanner([noPeak, run], null)!;

    expect(banner).toMatch(/no monitor Peak reading/i);
    expect(banner).toMatch(/\b9\b/);
  });

  it("keeps the two observations behind both reconciliation kinds", () => {
    for (const reconciliation of [evidence, inProgress]) {
      const banner = warningBanner([noPeak, run, reconciliation], 13)!;
      expect(banner).toBe(warningBanner([reconciliation], 13));
    }
  });

  it("returns nothing for warnings it does not render", () => {
    expect(warningBanner([{ kind: "cycle-out-of-band", cycleNo: 1, length: 60 }], null)).toBeNull();
    expect(warningBanner([], 13)).toBeNull();
  });

  it("handles an undetermined window end without printing a broken day", () => {
    expect(warningBanner([evidence], null)).toMatch(/undetermined/i);
    expect(warningBanner([evidence], null)).not.toMatch(/day null|day undefined/);
  });

  it("uses no error, invalid, malfunction, or disclaimer language", () => {
    for (const banner of [
      warningBanner([evidence], 13)!,
      warningBanner([inProgress], 13)!,
      warningBanner([noPeak], null)!,
      warningBanner([run], null)!,
      warningBanner([noPeak, run], null)!,
    ]) {
      expect(banner).not.toMatch(/invalid|error|malfunction|fault|incorrect/i);
      expect(banner).not.toMatch(/disclaimer|medical advice|consult (a|your)/i);
    }
  });

  it("gives each warning kind distinct label text", () => {
    const labels = Object.values(WARNING_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
    expect(WARNING_LABELS["monitor-evidence-outside-window"]).not.toBe(
      WARNING_LABELS["open-cycle-past-window-end"],
    );
  });
});

/**
 * A countdown is the one thing this method is defined against, and it is also the easiest thing to
 * reintroduce by accident: a negative `cycleDay - peakDay` is a countdown if it is rendered, and so is
 * a "you are on day N of your window" style line. Every line below is checked against it.
 */
const COUNTDOWN =
  /\d+ days? (until|to|before)|until (your |the )?peak|days? to (your |the )?peak|next peak|coming peak|countdown|days? remaining/i;

describe("peakCountLine", () => {
  /**
   * `todayCycleDay` defaults high so an ordinary case is not accidentally in the future; the
   * future-date cases pass 16 explicitly, which is today's cycle day in them.
   */
  const at = (peakDay: number | null, cycleDay: number, peaks = 1, todayCycleDay = 99) =>
    peakCountLine({ peakDay, cycleDay, todayCycleDay, peaks });

  it("counts the cycle days since the Peak and names the day it falls on", () => {
    const line = at(12, 15)!;

    expect(line).toContain("3 days");
    expect(line).toContain("cycle day 12");
  });

  it("is singular for a single day", () => {
    expect(at(12, 13)).toContain("1 day since");
    expect(at(12, 13)).not.toContain("1 days");
  });

  it("phrases the same day without printing a zero count", () => {
    // "0 days since" reads as a measurement failure rather than as a fact.
    const line = at(12, 12)!;

    expect(line).toMatch(/same day/i);
    expect(line).toContain("cycle day 12");
    expect(line).not.toContain("0");
  });

  it("counts in cycle days, so an unlogged stretch does not move the number", () => {
    // Nothing between the two days is an input: a 3-day gap and a 10-day gap are both
    // just the difference of the two cycle days, whether or not the days hold records.
    expect(at(10, 13)).toContain("3 days");
    expect(at(10, 20)).toContain("10 days");
  });

  it("shows an empty state and no number when no Peak is logged", () => {
    const line = at(null, 15, 0)!;

    expect(line).toMatch(/no peak reading logged/i);
    expect(line).not.toMatch(/\d/);
  });

  it("names the Peak day and shows no count on a date before it", () => {
    // A negative difference is a countdown in all but name, so nothing numeric renders here.
    const line = at(12, 8)!;

    expect(line).toContain("cycle day 12");
    expect(line).toMatch(/before it/i);
    expect(line).not.toMatch(/-?\d+ days? since/);
  });

  it("says how many Peak readings the cycle holds when there is more than one", () => {
    const line = at(15, 17, 2)!;

    expect(line).toContain("2 days");
    expect(line).toContain("cycle day 15");
    expect(line).toMatch(/last of 2 peak readings/i);
  });

  it("adds no tally clause for a single Peak reading", () => {
    expect(at(12, 15)).not.toMatch(/last of/i);
  });

  it("refuses to count days that have not happened yet", () => {
    // The picker lets a date be selected that is still in the future. "13 days since" would
    // assert that thirteen days have elapsed when some of them have not, so a future date gets
    // the Peak's day and no count. Today is cycle day 16; this is cycle day 24.
    const line = at(11, 24, 1, 16)!;

    expect(line).toContain("cycle day 11");
    expect(line).toMatch(/has not happened yet/i);
    expect(line).not.toMatch(/\d+ days? since/);
    expect(line).not.toMatch(COUNTDOWN);
  });

  it("treats today itself as having happened", () => {
    // The boundary matters: today is the last date the count may speak about.
    expect(at(11, 16, 1, 16)).toContain("5 days since");
    expect(at(11, 17, 1, 16)).toMatch(/has not happened yet/i);
  });

  it("keeps the multiple-Peak tally on a future date", () => {
    expect(at(15, 30, 3, 16)).toMatch(/last of 3 peak readings/i);
  });

  it("never renders a countdown, a safety claim, or a disclaimer", () => {
    const lines = [
      at(12, 13),
      at(12, 15),
      at(15, 17, 2),
      at(12, 12),
      at(12, 8),
      at(11, 24, 2, 16),
      at(null, 15, 0),
      at(null, 24, 0, 16),
    ];

    for (const line of lines) {
      expect(line).not.toMatch(COUNTDOWN);
      expect(line).not.toMatch(/safe|infertil/i);
      expect(line).not.toMatch(/disclaimer|medical advice|consult (a|your)/i);
    }
  });
});

describe("expectedPeakRangeLine", () => {
  function forecastWith(range: Forecast["peakDayRangeInWindow"], lookbackWindow = 6): Forecast {
    return {
      basedOnCycles: lookbackWindow,
      lookbackWindow,
      configuredLookbackWindow: lookbackWindow,
      outOfBandCount: 0,
      meanLength: 28,
      medianLength: 28,
      earliestLength: 26,
      latestLength: 30,
      peakDayEarliest: range?.earliest ?? 0,
      peakDayLatest: range?.latest ?? 0,
      peakDayRangeInWindow: range,
      expectedPeriodStart: "2026-03-01",
      nextFertileWindow: { begin: "2026-01-08", end: "2026-01-20" },
    };
  }

  it("reports the range and says it comes from past cycles", () => {
    const line = expectedPeakRangeLine(forecastWith({ earliest: 12, latest: 17, cycles: 6 }))!;

    expect(line).toContain("12");
    expect(line).toContain("17");
    expect(line).toMatch(/based on your last 6 completed cycles/i);
    expect(line).toMatch(/past cycles|last 6 completed/i);
  });

  it("is pluralised for one completed cycle", () => {
    const line = expectedPeakRangeLine(forecastWith({ earliest: 14, latest: 15, cycles: 1 }, 1))!;

    expect(line).toMatch(/last 1 completed cycle\b/);
    expect(line).not.toMatch(/cycles/);
  });

  it("says how many of the window's cycles actually carried a Peak", () => {
    // The window is six cycles wide; only four of them had a Peak, and claiming
    // otherwise would overstate the evidence behind the range.
    const line = expectedPeakRangeLine(forecastWith({ earliest: 14, latest: 15, cycles: 2 }))!;

    expect(line).toMatch(/last 6 completed cycles/);
    expect(line).toMatch(/2 of those cycles have a peak reading/i);
  });

  it("omits that sentence when every cycle in the window carried a Peak", () => {
    const line = expectedPeakRangeLine(forecastWith({ earliest: 12, latest: 17, cycles: 6 }))!;

    expect(line).not.toMatch(/of those cycles/);
  });

  it("shows nothing when there is no forecast or no range in it", () => {
    expect(expectedPeakRangeLine(null)).toBeNull();
    expect(expectedPeakRangeLine(forecastWith(null))).toBeNull();
  });

  it("reports a single day when the window's Peaks all fall on one day", () => {
    const line = expectedPeakRangeLine(forecastWith({ earliest: 15, latest: 15, cycles: 6 }))!;

    expect(line).toContain("15");
    expect(line).not.toMatch(/15 (to|-|–) 15/);
  });

  it("never presents a specific day, a countdown, or a source cue", () => {
    const lines = [
      expectedPeakRangeLine(forecastWith({ earliest: 12, latest: 17, cycles: 6 })),
      expectedPeakRangeLine(forecastWith({ earliest: 14, latest: 15, cycles: 2 })),
      expectedPeakRangeLine(forecastWith({ earliest: 15, latest: 15, cycles: 1 }, 1)),
    ];

    for (const line of lines) {
      expect(line).not.toMatch(COUNTDOWN);
      expect(line).not.toMatch(/predicted|confirmed|ovulation/i);
      expect(line).not.toMatch(/disclaimer|medical advice|consult (a|your)/i);
    }
  });
});
