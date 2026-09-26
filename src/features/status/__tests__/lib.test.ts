// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { EndRule } from "@/core/engine/types";
import {
  END_RULE_LABELS,
  STATUS_LABELS,
  WARNING_LABELS,
  endRuleLabel,
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
