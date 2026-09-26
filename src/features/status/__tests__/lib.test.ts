// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { EndRule } from "@/core/engine/types";
import { END_RULE_LABELS, endRuleLabel, windowDescription } from "../lib";

const RULES: EndRule[] = ["current-peak-plus-n", "historic-peak-plus-n", "earliest-end", "none"];

describe("endRuleLabel", () => {
  it("substitutes the configured post-Peak interval into every rule label", () => {
    expect(endRuleLabel("current-peak-plus-n", 4)).toBe("current Peak + 4 days");
    expect(endRuleLabel("current-peak-plus-n", 2)).toBe("current Peak + 2 days");
    expect(endRuleLabel("historic-peak-plus-n", 4)).toBe("latest historical Peak + 4 days");
    expect(endRuleLabel("historic-peak-plus-n", 0)).toBe("latest historical Peak + 0 days");
  });

  it("never leaves the N placeholder in any rule label", () => {
    for (const rule of RULES) {
      for (const days of [0, 3, 4, 10]) {
        const label = endRuleLabel(rule, days);
        expect(label).not.toContain("N days");
        expect(label).toBe(END_RULE_LABELS[rule].replace("N days", `${days} days`));
      }
    }
  });

  it("keeps rules that carry no day count unchanged", () => {
    expect(endRuleLabel("earliest-end", 4)).toBe(END_RULE_LABELS["earliest-end"]);
    expect(endRuleLabel("none", 4)).toBe(END_RULE_LABELS.none);
  });
});

describe("windowDescription", () => {
  const window = {
    begin: 6,
    end: 18,
    beginRule: "calendar-day-6",
    endRule: "current-peak-plus-n",
  } as const;

  it("describes the configured interval in the window line", () => {
    expect(windowDescription(window, true, 4)).toBe(
      "Fertile from cycle day 6 (calendar rule (cycle day 6)); until day 18 (current Peak + 4 days).",
    );
    expect(windowDescription({ ...window, end: 16 }, true, 2)).toContain("(current Peak + 2 days)");
  });

  it("explains a pending or unknown end without a day count", () => {
    expect(windowDescription({ ...window, end: null, endRule: "none" }, true, 4)).toBe(
      "Fertile from cycle day 6 (calendar rule (cycle day 6)); end pending new readings after Peak.",
    );
    expect(windowDescription({ ...window, end: null, endRule: "none" }, false, 4)).toBe(
      "Fertile from cycle day 6 (calendar rule (cycle day 6)); end unknown until a Peak is read.",
    );
  });
});
