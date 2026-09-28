import { describe, expect, it } from "vitest";
import type { BeginRule, CycleResult, EndRule, EngineWarning } from "@/core/engine/types";
import type { DayRecordEntity } from "@/core/store/entities";
import {
  algorithmOffNote,
  buildSummaryModel,
  dayRangeLine,
  exclusionsNote,
  lengthLine,
  peakLine,
  snapshotLine,
  warningLines,
  windowBasis,
  type ProtocolBand,
} from "../lib";
import { END_RULE_LABELS } from "@/features/status/lib";

/**
 * The words the document must never produce. A narrower set than the Status view's: an out-of-band
 * cycle legitimately points at an instructor, the same way History already does, so "marquette-certified
 * instructor" and "consult a" are permitted here. Everything that asserts safety, authority, or fault is
 * not, and neither is anything that reads as a countdown.
 */
const FORBIDDEN =
  /disclaimer|medical advice|not a substitute|medical device|seek (medical|professional)|\binvalid\b|\bmalfunction\b|\bfault\b|\bincorrect\b|\bguarantee\b|\bsafe\b|\brisk\b/i;
const COUNTDOWN = /\d+ days? until|until (your |the )?peak|days? to (your |the )?peak|next peak/i;

const BAND: ProtocolBand = { min: 21, max: 42 };

/** Records carry sync metadata in the store; the model only reads the observation fields. */
function record(
  cycleId: string,
  dayInCycle: number,
  date: string,
  values: Partial<DayRecordEntity> = {},
): DayRecordEntity {
  return {
    id: `${cycleId}-${dayInCycle}`,
    cycleId,
    date,
    dayInCycle,
    version: 1,
    synced: false,
    createdAt: date,
    updatedAt: date,
    ...values,
  } as DayRecordEntity;
}

function day(day: number, date: string) {
  return { day, date, status: "fertile" as const };
}

/** A closed 28-day cycle, a first High on day 8, and a monitor Peak on day 14. */
function closedCycle(overrides: Partial<CycleResult> = {}): CycleResult {
  return {
    cycleId: "c1",
    cycleNo: 3,
    day1: "2026-01-01",
    length: 28,
    peakDay: 14,
    peakSource: "monitor",
    fertileWindow: {
      begin: 6,
      end: 17,
      beginRule: "calendar-day-6",
      endRule: "current-peak-plus-n",
    },
    days: Array.from({ length: 28 }, (_, index) =>
      day(index + 1, `2026-01-${String(index + 1).padStart(2, "0")}`),
    ),
    warnings: [],
    ...overrides,
  };
}

function model(
  result: CycleResult,
  records: DayRecordEntity[] = [],
  warnings: EngineWarning[] = [],
  algorithmEnabled = true,
) {
  return buildSummaryModel({ result, records, warnings, band: BAND, algorithmEnabled });
}

describe("buildSummaryModel", () => {
  it("reports a closed cycle's identity, day range, and length", () => {
    const summary = model(closedCycle());

    expect(summary.cycleNo).toBe(3);
    expect(summary.day1).toBe("2026-01-01");
    expect(summary.firstDay).toBe(1);
    expect(summary.lastDay).toBe(28);
    expect(summary.open).toBe(false);
    expect(summary.length).toBe(28);
  });

  it("reports an unfinished cycle as open with no length", () => {
    const summary = model(
      closedCycle({
        length: null,
        days: Array.from({ length: 17 }, (_, index) =>
          day(index + 1, `2026-01-${String(index + 1).padStart(2, "0")}`),
        ),
      }),
    );

    expect(summary.open).toBe(true);
    expect(summary.length).toBeNull();
    expect(summary.firstDay).toBe(1);
    expect(summary.lastDay).toBe(17);
  });

  it("counts every monitor Peak reading so the anchoring one is identifiable", () => {
    const records = [
      record("c1", 12, "2026-01-12", { monitor: "peak" }),
      record("c1", 15, "2026-01-15", { monitor: "peak" }),
    ];
    const summary = model(closedCycle({ peakDay: 15 }), records);

    expect(summary.peakDay).toBe(15);
    expect(summary.peakCount).toBe(2);
  });

  it("reports no Peak day for a cycle with no monitor Peak reading", () => {
    const summary = model(closedCycle({ peakDay: null, peakSource: "none" }));

    expect(summary.peakDay).toBeNull();
    expect(summary.peakCount).toBe(0);
  });

  it("keeps a day with no Day Record, holding no reading", () => {
    const summary = model(closedCycle(), [record("c1", 8, "2026-01-08", { monitor: "high" })]);

    expect(summary.days).toHaveLength(28);
    const unlogged = summary.days.find((entry) => entry.day === 9);
    expect(unlogged).toMatchObject({ day: 9, date: "2026-01-09", monitor: null, unlogged: true });
    expect(summary.days.find((entry) => entry.day === 8)).toMatchObject({
      monitor: "high",
      unlogged: false,
    });
  });

  it("treats an explicit monitor 'none' as no reading logged", () => {
    // A stored `none` is the CBPM's "no reading" — it must not print as a reading.
    const summary = model(closedCycle(), [record("c1", 8, "2026-01-08", { monitor: "none" })]);

    expect(summary.days.find((entry) => entry.day === 8)).toMatchObject({
      monitor: null,
      unlogged: false,
    });
  });

  it("shows no optional column when the cycle holds nothing beyond readings", () => {
    const summary = model(closedCycle(), [
      record("c1", 1, "2026-01-01", { bloodFlow: "medium" }),
      record("c1", 8, "2026-01-08", { monitor: "high" }),
    ]);

    // Menses on Day 1 is the cycle's own definition, so it is logged and the column is on.
    expect(summary.columns).toEqual({
      menses: true,
      mucus: false,
      bbt: false,
      intercourse: false,
      pregnancyTest: false,
      symptoms: false,
      notes: false,
    });
  });

  it("turns each optional column on independently as the data appears", () => {
    const summary = model(closedCycle(), [
      record("c1", 1, "2026-01-01", { bloodFlow: "medium" }),
      record("c1", 10, "2026-01-10", { mucus: "high" }),
      record("c1", 11, "2026-01-11", { bbt: 36.4 }),
      record("c1", 12, "2026-01-12", { intercourse: true }),
      record("c1", 20, "2026-01-20", { pregnancyTest: "negative" }),
      record("c1", 21, "2026-01-21", { symptoms: ["headache"] }),
      record("c1", 22, "2026-01-22", { notes: "long cycle" }),
    ]);

    expect(summary.columns).toEqual({
      menses: true,
      mucus: true,
      bbt: true,
      intercourse: true,
      pregnancyTest: true,
      symptoms: true,
      notes: true,
    });
  });

  it("keeps a logged 'none' for a mucus value, because that is a recorded observation", () => {
    const summary = model(closedCycle(), [record("c1", 10, "2026-01-10", { mucus: "none" })]);

    expect(summary.columns.mucus).toBe(true);
    expect(summary.days.find((entry) => entry.day === 10)).toMatchObject({ mucus: "none" });
  });

  it("keeps a recorded temperature of zero and a logged null temperature apart from an absent one", () => {
    const summary = model(closedCycle(), [
      record("c1", 10, "2026-01-10", { bbt: 0 }),
      record("c1", 11, "2026-01-11", { bbt: null }),
    ]);

    expect(summary.days.find((entry) => entry.day === 10)).toMatchObject({ bbt: 0 });
    // An explicit `null` is the chart's "no reading that morning" and must not print as a value.
    expect(summary.days.find((entry) => entry.day === 11)).toMatchObject({ bbt: null });
  });

  it("carries the computed window when interpretation is on", () => {
    const summary = model(closedCycle());

    expect(summary.window).toMatchObject({ begin: 6, end: 17, days: 12 });
    expect(summary.window?.beginBasis).not.toBe("");
    expect(summary.window?.endBasis).not.toBe("");
  });

  it("reports no window length when the protocol could not set an end", () => {
    const summary = model(
      closedCycle({
        peakDay: null,
        peakSource: "none",
        fertileWindow: { begin: 6, end: null, beginRule: "calendar-day-6", endRule: "none" },
      }),
    );

    expect(summary.window).toMatchObject({ begin: 6, end: null, days: null });
  });

  it("keeps the identity and the log but drops every derived value with interpretation off", () => {
    const summary = model(
      closedCycle(),
      [
        record("c1", 12, "2026-01-12", { monitor: "peak" }),
        record("c1", 1, "2026-01-01", { bloodFlow: "medium" }),
      ],
      [{ kind: "no-peak-end", cycleNo: 3 }],
      false,
    );

    expect(summary.window).toBeNull();
    expect(summary.peakDay).toBeNull();
    expect(summary.warnings).toEqual([]);
    // The raw log still carries the Peak reading: it was logged, not computed.
    expect(summary.days.find((entry) => entry.day === 12)).toMatchObject({ monitor: "peak" });
    expect(summary.cycleNo).toBe(3);
    expect(summary.length).toBe(28);
    expect(summary.lastDay).toBe(28);
  });

  it("reports one line per warning the app raised for the cycle", () => {
    const summary = model(
      closedCycle(),
      [],
      [
        { kind: "monitor-evidence-outside-window", cycleNo: 3, day: 22 },
        { kind: "no-peak-end", cycleNo: 3 },
      ],
    );

    expect(summary.warnings).toHaveLength(2);
    expect(summary.warnings[0]).toContain("22");
  });

  it("reports no warnings for a clean cycle", () => {
    expect(model(closedCycle()).warnings).toEqual([]);
  });

  it("survives a cycle with no days rather than throwing", () => {
    const summary = model(closedCycle({ days: [] }));

    expect(summary.days).toEqual([]);
    expect(summary.firstDay).toBe(1);
    expect(summary.lastDay).toBe(0);
  });
});

/**
 * Table-driven over every rule value the engine produces, so adding a rule to the engine is a type error
 * here rather than a blank line on a document somebody hands to their instructor.
 */
const BEGIN_RULES: BeginRule[] = [
  "calendar-day-6",
  "calendar-day-6-fallback",
  "calendar-earliest-peak-minus-6",
  "first-high-or-peak",
];

const END_RULES: EndRule[] = [
  "current-peak-plus-n",
  "lookback-latest-peak-plus-n",
  "protocol-fallback-window",
  "none",
];

describe("windowBasis", () => {
  it("calls the calendar rule a calendar rule and a reading a reading, for every begin rule", () => {
    const calendar: BeginRule[] = [
      "calendar-day-6",
      "calendar-day-6-fallback",
      "calendar-earliest-peak-minus-6",
    ];

    for (const beginRule of calendar) {
      const basis = windowBasis({ beginRule, endRule: "none" }, null);
      expect(basis.begin).toBe("Set by the calendar rule, not by a reading.");
    }

    const fromReading = windowBasis({ beginRule: "first-high-or-peak", endRule: "none" }, null);
    expect(fromReading.begin).toMatch(/your own reading/i);
    expect(fromReading.begin).toMatch(/first High or Peak/i);
  });

  it("covers every begin rule and every end rule with real wording", () => {
    for (const beginRule of BEGIN_RULES) {
      expect(windowBasis({ beginRule, endRule: "none" }, null).begin).not.toBe("");
    }
    for (const endRule of END_RULES) {
      expect(windowBasis({ beginRule: "calendar-day-6", endRule }, 12).end).not.toBe("");
    }
  });

  it("names the anchoring Peak day when the end came from this cycle's own Peak", () => {
    const basis = windowBasis({ beginRule: "calendar-day-6", endRule: "current-peak-plus-n" }, 12);

    expect(basis.end).toContain("cycle day 12");
    expect(basis.end).toMatch(/three full days/i);
  });

  it("never names an earlier cycle's Peak as the reason a recorded window ended", () => {
    // A cycle's end is its own Peak plus the fixed interval, or there is no end. The deleted
    // earlier-of-two and historical-fallback rules are the only ways this sentence could have gone
    // wrong, so every rule is checked for it.
    for (const endRule of END_RULES) {
      for (const peakDay of [null, 12]) {
        const basis = windowBasis({ beginRule: "calendar-day-6", endRule }, peakDay);
        expect(basis.end, `${endRule}/${peakDay}`).not.toMatch(/earlier cycles/i);
        expect(basis.end, `${endRule}/${peakDay}`).not.toMatch(/whichever came first/i);
        expect(basis.end, `${endRule}/${peakDay}`).not.toMatch(/historic/i);
      }
    }
  });

  it("says plainly that no end can be set when the protocol could not set one", () => {
    const basis = windowBasis({ beginRule: "calendar-day-6", endRule: "none" }, null);

    expect(basis.end).toMatch(/no end can be set/i);
    expect(basis.end).toMatch(/three full days/i);
    // No date is offered from any other cycle in place of the missing end.
    expect(basis.end).not.toMatch(/cycle day \d/);
  });

  it("has wording for the projection-only rules rather than falling through", () => {
    // The document never sees these — projections are excluded — but a Record must still cover them.
    const lookback = windowBasis(
      { beginRule: "calendar-day-6", endRule: "lookback-latest-peak-plus-n" },
      null,
    );
    expect(lookback.end).toMatch(/recent cycles/i);

    const fallback = windowBasis(
      { beginRule: "calendar-day-6", endRule: "protocol-fallback-window" },
      null,
    );
    // The old wording called this a "default band"; the window is composed, not a band.
    expect(fallback.end).toMatch(/earliest possible Peak day/i);
    expect(fallback.end).not.toMatch(/band/i);
  });

  it("states the post-Peak interval as three full days wherever a Peak sets the end", () => {
    // The post-Peak interval is a protocol constant, so a basis that measures from a Peak must carry
    // the number. `none` explains the missing interval.
    const fromAPeak: EndRule[] = [
      "current-peak-plus-n",
      "lookback-latest-peak-plus-n",
      "protocol-fallback-window",
    ];

    for (const endRule of fromAPeak) {
      expect(windowBasis({ beginRule: "calendar-day-6", endRule }, 12).end).toMatch(
        /three full days/i,
      );
    }
    expect(windowBasis({ beginRule: "calendar-day-6", endRule: "none" }, null).end).toMatch(
      /three full days/i,
    );
  });

  it("never renders the post-Peak interval as a placeholder", () => {
    for (const endRule of END_RULES) {
      const basis = windowBasis({ beginRule: "calendar-day-6", endRule }, 12);
      expect(basis.end).not.toMatch(/\bN\b|\bN days\b|\+\s*N\b/);
    }
  });

  it("produces no forbidden or countdown wording for any rule pairing", () => {
    for (const beginRule of BEGIN_RULES) {
      for (const endRule of END_RULES) {
        for (const peakDay of [null, 12]) {
          const basis = windowBasis({ beginRule, endRule }, peakDay);
          expect(basis.begin).not.toMatch(FORBIDDEN);
          expect(basis.end).not.toMatch(FORBIDDEN);
          expect(basis.begin).not.toMatch(COUNTDOWN);
          expect(basis.end).not.toMatch(COUNTDOWN);
        }
      }
    }
  });
});

describe("window rules on the model", () => {
  it("quotes the rule behind each end from the Status vocabulary, carrying the literal 3", () => {
    const summary = model(closedCycle());

    expect(summary.window?.beginRule).toBe("calendar rule (cycle day 6)");
    expect(summary.window?.endRule).toBe(END_RULE_LABELS["current-peak-plus-n"]);
    expect(summary.window?.endRule).toContain("3");
  });

  it("pairs a basis sentence with a rule for every rule the engine can produce", () => {
    const beginRules: Record<BeginRule, EndRule> = {
      "calendar-day-6": "current-peak-plus-n",
      "calendar-day-6-fallback": "current-peak-plus-n",
      "calendar-earliest-peak-minus-6": "lookback-latest-peak-plus-n",
      "first-high-or-peak": "none",
    };
    for (const [beginRule, endRule] of Object.entries(beginRules) as [BeginRule, EndRule][]) {
      const summary = model(
        closedCycle({
          fertileWindow: { begin: 8, end: endRule === "none" ? null : 17, beginRule, endRule },
        }),
      );
      expect(summary.window?.beginBasis).not.toBe("");
      expect(summary.window?.endBasis).not.toBe("");
      expect(summary.window?.beginRule).not.toBe("");
      expect(summary.window?.endRule).not.toBe("");
    }
  });
});

describe("warningLines", () => {
  const context = { windowEnd: 17, band: BAND };

  it("gives one line per warning, covering every kind the engine raises", () => {
    const all: EngineWarning[] = [
      { kind: "monitor-evidence-outside-window", cycleNo: 3, day: 22 },
      { kind: "open-cycle-past-window-end", cycleNo: 3 },
      { kind: "no-peak-end", cycleNo: 3 },
      { kind: "high-run", cycleNo: 3, run: 9 },
      { kind: "cycle-out-of-band", cycleNo: 3, length: 50 },
    ];

    expect(warningLines(all, context)).toHaveLength(all.length);
  });

  it("names the offending cycle day and says the window was not moved", () => {
    const [line] = warningLines(
      [{ kind: "monitor-evidence-outside-window", cycleNo: 3, day: 22 }],
      {
        windowEnd: 17,
        band: BAND,
      },
    );

    expect(line).toContain("cycle day 22");
    expect(line).toContain("day 17");
    expect(line).toMatch(/window has not changed/i);
  });

  it("names the end cycle day for a cycle still in progress past it", () => {
    const [line] = warningLines([{ kind: "open-cycle-past-window-end", cycleNo: 3 }], {
      windowEnd: 17,
      band: BAND,
    });

    expect(line).toContain("day 17");
    expect(line).toMatch(/has not closed yet/i);
  });

  it("says what an undetermined end is when there is no end day", () => {
    const [line] = warningLines([{ kind: "open-cycle-past-window-end", cycleNo: 3 }], {
      windowEnd: null,
      band: BAND,
    });

    expect(line).toContain("undetermined day");
  });

  it("explains a missing Peak rather than only naming the absence", () => {
    const [line] = warningLines([{ kind: "no-peak-end", cycleNo: 3 }], context);

    expect(line).toMatch(/no monitor Peak reading/i);
    expect(line).toMatch(/no end can be set/i);
  });

  it("reports the length of a long run of High readings without calling it a Peak", () => {
    const [line] = warningLines([{ kind: "high-run", cycleNo: 3, run: 9 }], context);

    expect(line).toMatch(/\b9\b/);
    expect(line).toMatch(/high/i);
    // The run is not a Peak reading, and a document handed to an instructor must not imply it is.
    expect(line).not.toMatch(/peak reading/i);
    expect(line).not.toMatch(FORBIDDEN);
  });

  it("names the run's own length rather than a fixed one", () => {
    const [line] = warningLines([{ kind: "high-run", cycleNo: 3, run: 14 }], context);

    expect(line).toMatch(/\b14\b/);
  });

  it("states the length and the band for an out-of-band cycle", () => {
    const [line] = warningLines([{ kind: "cycle-out-of-band", cycleNo: 3, length: 50 }], context);

    expect(line).toContain("50 days");
    expect(line).toContain("21");
    expect(line).toContain("42");
  });

  it("quotes the band the engine was configured with, not a hard-coded one", () => {
    const [line] = warningLines([{ kind: "cycle-out-of-band", cycleNo: 3, length: 18 }], {
      windowEnd: 17,
      band: { min: 25, max: 35 },
    });

    expect(line).toContain("25");
    expect(line).toContain("35");
    expect(line).not.toContain("21");
  });

  it("produces no lines for a cycle with no warnings", () => {
    expect(warningLines([], context)).toEqual([]);
  });

  it("produces no forbidden or countdown wording for any warning", () => {
    const all: EngineWarning[] = [
      { kind: "monitor-evidence-outside-window", cycleNo: 3, day: 22 },
      { kind: "open-cycle-past-window-end", cycleNo: 3 },
      { kind: "no-peak-end", cycleNo: 3 },
      { kind: "high-run", cycleNo: 3, run: 9 },
      { kind: "cycle-out-of-band", cycleNo: 3, length: 50 },
    ];

    for (const line of warningLines(all, { windowEnd: 17, band: BAND })) {
      expect(line).not.toMatch(FORBIDDEN);
      expect(line).not.toMatch(COUNTDOWN);
    }
  });
});

describe("header lines", () => {
  it("states the cycle-day range", () => {
    expect(dayRangeLine(1, 28)).toBe("Cycle days 1 to 28");
    expect(dayRangeLine(17, 17)).toBe("Cycle day 17");
    expect(dayRangeLine(1, 0)).toBe("No cycle days recorded");
  });

  it("states a closed cycle's length as a number of days", () => {
    expect(lengthLine(28, 28)).toBe("28 days");
    expect(lengthLine(1, 1)).toBe("1 day");
  });

  it("states an unfinished cycle as in progress, with no number in the length's place", () => {
    const line = lengthLine(null, 17);

    expect(line).toMatch(/in progress/i);
    expect(line).toContain("cycle day 17");
    expect(line).toMatch(/not known/i);
    expect(line).not.toMatch(/\b17 days\b/);
  });

  it("names the Peak day and says how many Peak readings the cycle holds", () => {
    expect(peakLine(12, 1)).toBe("Monitor Peak on cycle day 12.");
    expect(peakLine(15, 2)).toContain("The last of 2 monitor Peak readings in this cycle.");
  });

  it("says a cycle has no Peak reading rather than showing an empty Peak day", () => {
    const line = peakLine(null, 0);

    expect(line).toMatch(/no monitor Peak reading/i);
    expect(line).not.toMatch(/cycle day \d/);
  });

  it("carries the generation date and says the document is a snapshot that does not update", () => {
    const line = snapshotLine("2026-09-27");

    expect(line).toContain("2026-09-27");
    expect(line).toMatch(/snapshot/i);
    expect(line).toMatch(/does not update/i);
  });

  it("states that predictions and projected cycles are excluded", () => {
    const note = exclusionsNote();

    expect(note).toMatch(/predictions/i);
    expect(note).toMatch(/projected future cycles/i);
    expect(note).toMatch(/not included/i);
  });

  it("explains why the derived half is missing with interpretation off", () => {
    const note = algorithmOffNote();

    expect(note).toMatch(/algorithm is off/i);
    expect(note).toMatch(/raw log/i);
    expect(note).toMatch(/no fertile window/i);
    expect(note).toMatch(/no peak day/i);
    expect(note).toMatch(/no protocol notes/i);
  });

  it("produces no forbidden or countdown wording in any header line", () => {
    const lines = [
      dayRangeLine(1, 28),
      dayRangeLine(1, 0),
      lengthLine(28, 28),
      lengthLine(1, 1),
      lengthLine(null, 17),
      peakLine(12, 1),
      peakLine(15, 2),
      peakLine(null, 0),
      snapshotLine("2026-09-27"),
      exclusionsNote(),
      algorithmOffNote(),
    ];

    for (const line of lines) {
      expect(line).not.toMatch(FORBIDDEN);
      expect(line).not.toMatch(COUNTDOWN);
    }
  });
});
