// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { EndRule, Forecast } from "@/core/engine/types";
import {
  END_RULE_LABELS,
  STATUS_LABELS,
  WARNING_LABELS,
  endRuleLabel,
  expectedPeakRangeLine,
  peakCountLine,
  windowDescription,
  warningBanner,
} from "../lib";

const RULES: EndRule[] = ["current-peak-plus-n", "historic-peak-plus-n", "earliest-end", "none"];

describe("endRuleLabel", () => {
  it("names the fixed three-day interval in the rules that carry a day count", () => {
    expect(endRuleLabel("current-peak-plus-n")).toBe("current monitor Peak + 3 days");
    expect(endRuleLabel("historic-peak-plus-n")).toBe("latest historical Peak + 3 days");
  });

  it("never leaves an N placeholder in any rule label", () => {
    for (const rule of RULES) {
      expect(endRuleLabel(rule)).not.toContain("N days");
    }
  });

  it("keeps rules that carry no day count unchanged", () => {
    expect(endRuleLabel("earliest-end")).toBe(END_RULE_LABELS["earliest-end"]);
    expect(endRuleLabel("none")).toBe(END_RULE_LABELS.none);
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
      "Fertile from cycle day 6 (calendar rule (cycle day 6)); until day 17 (current monitor Peak + 3 days).",
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
    const finiteRules = [
      "current-peak-plus-n",
      "historic-peak-plus-n",
      "earliest-end",
      "protocol-default-band",
    ] as const;

    for (const rule of finiteRules) {
      // peakKnown only affects the undetermined-end branch, so it is irrelevant here.
      const line = windowDescription({ ...window, end: 17, endRule: rule }, true);
      expect(line).toContain(END_RULE_LABELS[rule]);
    }
  });

  it("gives the two post-window rules distinct text", () => {
    const byPeak = windowDescription({ ...window, end: 17, endRule: "current-peak-plus-n" }, true);
    const byHistory = windowDescription(
      { ...window, end: 17, endRule: "historic-peak-plus-n" },
      false,
    );

    expect(byPeak).not.toBe(byHistory);
    expect(byPeak).toContain(END_RULE_LABELS["current-peak-plus-n"]);
    expect(byHistory).toContain(END_RULE_LABELS["historic-peak-plus-n"]);
  });

  it("carries no rule name when the end is undetermined", () => {
    const pending = windowDescription({ ...window, end: null, endRule: "none" }, true);
    expect(pending).not.toContain(END_RULE_LABELS.none);
  });
});

describe("warningBanner", () => {
  const evidence = { kind: "monitor-evidence-outside-window", cycleNo: 1, day: 15 } as const;
  const inProgress = { kind: "open-cycle-past-window-end", cycleNo: 1 } as const;

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

  it("returns nothing for warnings it does not render", () => {
    expect(warningBanner([{ kind: "no-peak-end", cycleNo: 1 }], null)).toBeNull();
    expect(warningBanner([{ kind: "cycle-out-of-band", cycleNo: 1, length: 60 }], null)).toBeNull();
    expect(warningBanner([], 13)).toBeNull();
  });

  it("handles an undetermined window end without printing a broken day", () => {
    expect(warningBanner([evidence], null)).toMatch(/undetermined/i);
    expect(warningBanner([evidence], null)).not.toMatch(/day null|day undefined/);
  });

  it("uses no error, invalid, malfunction, or disclaimer language", () => {
    for (const banner of [warningBanner([evidence], 13)!, warningBanner([inProgress], 13)!]) {
      expect(banner).not.toMatch(/invalid|error|malfunction|fault|incorrect/i);
      expect(banner).not.toMatch(/disclaimer|medical advice|consult (a|your)/i);
    }
  });

  it("gives each warning kind distinct label text", () => {
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
  it("counts the cycle days since the Peak and names the day it falls on", () => {
    const line = peakCountLine(12, 15, 1)!;

    expect(line).toContain("3 days");
    expect(line).toContain("cycle day 12");
  });

  it("is singular for a single day", () => {
    expect(peakCountLine(12, 13, 1)).toContain("1 day since");
    expect(peakCountLine(12, 13, 1)).not.toContain("1 days");
  });

  it("phrases the same day without printing a zero count", () => {
    // "0 days since" reads as a measurement failure rather than as a fact.
    const line = peakCountLine(12, 12, 1)!;

    expect(line).toMatch(/same day/i);
    expect(line).toContain("cycle day 12");
    expect(line).not.toContain("0");
  });

  it("counts in cycle days, so an unlogged stretch does not move the number", () => {
    // Nothing between the two days is an input: a 3-day gap and a 10-day gap are both
    // just the difference of the two cycle days, whether or not the days hold records.
    expect(peakCountLine(10, 13, 1)).toContain("3 days");
    expect(peakCountLine(10, 20, 1)).toContain("10 days");
  });

  it("shows an empty state and no number when no Peak is logged", () => {
    const line = peakCountLine(null, 15, 0)!;

    expect(line).toMatch(/no peak reading logged/i);
    expect(line).not.toMatch(/\d/);
  });

  it("names the Peak day and shows no count on a date before it", () => {
    // A negative difference is a countdown in all but name, so nothing numeric renders here.
    const line = peakCountLine(12, 8, 1)!;

    expect(line).toContain("cycle day 12");
    expect(line).toMatch(/before it/i);
    expect(line).not.toMatch(/-?\d+ days? since/);
  });

  it("says how many Peak readings the cycle holds when there is more than one", () => {
    const line = peakCountLine(15, 17, 2)!;

    expect(line).toContain("2 days");
    expect(line).toContain("cycle day 15");
    expect(line).toMatch(/last of 2 peak readings/i);
  });

  it("adds no tally clause for a single Peak reading", () => {
    expect(peakCountLine(12, 15, 1)).not.toMatch(/last of/i);
  });

  it("never renders a countdown, a safety claim, or a disclaimer", () => {
    const lines = [
      peakCountLine(12, 13, 1),
      peakCountLine(12, 15, 1),
      peakCountLine(15, 17, 2),
      peakCountLine(12, 12, 1),
      peakCountLine(12, 8, 1),
      peakCountLine(null, 15, 0),
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
