import { describe, expect, it } from "vitest";
import {
  BBT_PLAUSIBLE_C,
  BBT_USUAL_C,
  canonicalUnit,
  convertFromCelsius,
  convertToCelsius,
  formatForDisplay,
  isTemperatureUnit,
  normalizeTemperatureUnit,
  rangeHint,
  unitLabel,
  validateBbt,
} from "@/core/temperature";

describe("canonical storage unit", () => {
  it("stores in Celsius", () => {
    expect(canonicalUnit).toBe("c");
  });
});

describe("validateBbt - usual range", () => {
  // The usual band saves silently. Table-driven over the documented band edges.
  const cases: [number, string][] = [
    [35.0, "lower edge of the usual band"],
    [36.5, "typical reading"],
    [36.89, "just inside the upper edge"],
    [38.0, "upper edge of the usual band"],
  ];

  for (const [value, label] of cases) {
    it(`accepts ${value} without ceremony (${label})`, () => {
      expect(validateBbt(value, "c")).toEqual({ kind: "ok" });
    });
  }
});

describe("validateBbt - plausible but unusual needs confirmation", () => {
  const cases: [number, string][] = [
    [34.0, "lower edge of the plausible band"],
    [34.5, "cold reading"],
    [38.1, "fever"],
    [39.8, "high fever"],
    [42.0, "upper edge of the plausible band"],
  ];

  for (const [value, label] of cases) {
    it(`asks for confirmation at ${value} (${label})`, () => {
      const result = validateBbt(value, "c");
      expect(result.kind).toBe("confirm");
      if (result.kind === "confirm") {
        expect(result.value).toBe(value);
        // The warning names the usual range the user is expected to be in.
        expect(result.message).toContain("35–38 °C");
      }
    });
  }
});

describe("validateBbt - refused outside the plausible range", () => {
  const cases: [number, string][] = [
    [33.9, "just below the floor"],
    [25, "hypothermic"],
    [0, "freezing"],
    [42.1, "just above the ceiling"],
    [45, "not survivable"],
  ];

  for (const [value, label] of cases) {
    it(`refuses ${value} (${label})`, () => {
      const result = validateBbt(value, "c");
      expect(result.kind).toBe("refused");
      if (result.kind === "refused") {
        expect(result.reason).toBe("out-of-range");
        expect(result.message).toContain("34");
        expect(result.message).toContain("42");
      }
    });
  }

  it("refuses a value outside the plausible range in Fahrenheit too", () => {
    const result = validateBbt(120, "f");
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") {
      expect(result.reason).toBe("out-of-range");
    }
  });
});

describe("validateBbt - unit mismatch is refused with the likely cause named", () => {
  it("names Fahrenheit when a Fahrenheit reading is typed into a Celsius field", () => {
    const result = validateBbt(98.2, "c");
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") {
      expect(result.reason).toBe("unit-mismatch");
      expect(result.message).toContain("Fahrenheit");
      expect(result.message).toContain("36.78");
    }
  });

  it("names Celsius when a Celsius reading is typed into a Fahrenheit field", () => {
    const result = validateBbt(36.5, "f");
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") {
      expect(result.reason).toBe("unit-mismatch");
      expect(result.message).toContain("Celsius");
      expect(result.message).toContain("97.7");
    }
  });

  it("classifies across the whole plausible band of the other unit", () => {
    // 93.2..107.6 F is the plausible Fahrenheit band; none of it is plausible Celsius.
    for (const value of [93.2, 98.6, 100, 107.6]) {
      const result = validateBbt(value, "c");
      expect(result.kind).toBe("refused");
      if (result.kind === "refused") {
        expect(result.reason).toBe("unit-mismatch");
      }
    }
    // 34..42 C is the plausible Celsius band; none of it is plausible Fahrenheit.
    for (const value of [34, 36.5, 40, 42]) {
      const result = validateBbt(value, "f");
      expect(result.kind).toBe("refused");
      if (result.kind === "refused") {
        expect(result.reason).toBe("unit-mismatch");
      }
    }
  });

  it("names no other unit as the likely cause when the value is implausible in both scales", () => {
    const result = validateBbt(50, "c");
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") {
      expect(result.reason).toBe("out-of-range");
      // The field is in Celsius, so the message states the Celsius band. What it
      // must not do is blame the other scale for the value.
      expect(result.message).not.toContain("Fahrenheit");
      expect(result.message).toContain("34");
    }
  });
});

describe("validateBbt - non-numeric input", () => {
  it("refuses a value that is not a finite number", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const result = validateBbt(value, "c");
      expect(result.kind).toBe("refused");
      if (result.kind === "refused") {
        expect(result.reason).toBe("not-a-number");
      }
    }
  });
});

describe("band constants", () => {
  it("keeps the plausible band outside the usual band and disjoint from the other scale", () => {
    expect(BBT_USUAL_C.min).toBe(35);
    expect(BBT_USUAL_C.max).toBe(38);
    expect(BBT_PLAUSIBLE_C.min).toBe(34);
    expect(BBT_PLAUSIBLE_C.max).toBe(42);
    // The plausible Fahrenheit band (93.2-107.6) sits far above the plausible
    // Celsius ceiling (42), so "this is the other unit" is deterministic
    // rather than a guess, and the two bands never overlap.
    expect(convertFromCelsius(BBT_PLAUSIBLE_C.min, "f")).toBeGreaterThan(BBT_PLAUSIBLE_C.max);
    expect(convertFromCelsius(BBT_PLAUSIBLE_C.max, "f")).toBeGreaterThan(BBT_PLAUSIBLE_C.max * 2);
  });
});

describe("conversion", () => {
  const cases: [number, number, string][] = [
    [36.56, 97.808, "Celsius to Fahrenheit at full precision"],
    [36.5, 97.7, "typical reading"],
    [37, 98.6, "body temperature"],
    [35, 95, "lower usual edge"],
    [38, 100.4, "upper usual edge"],
    [34, 93.2, "lower plausible edge"],
    [42, 107.6, "upper plausible edge"],
  ];

  for (const [c, f, label] of cases) {
    it(`converts ${c} C to ${f} F (${label})`, () => {
      expect(convertFromCelsius(c, "f")).toBeCloseTo(f, 5);
    });
    it(`converts ${f} F to ${c} C (${label})`, () => {
      expect(convertToCelsius(f, "f")).toBeCloseTo(c, 5);
    });
  }

  it("is the identity in Celsius", () => {
    expect(convertFromCelsius(36.56, "c")).toBe(36.56);
    expect(convertToCelsius(36.56, "c")).toBe(36.56);
  });

  it("round-trips a Fahrenheit reading back to the digit the user typed", () => {
    const stored = convertToCelsius(98.2, "f");
    expect(formatForDisplay(stored, "f")).toBe("98.2");
  });
});

describe("formatForDisplay", () => {
  // Inputs are always canonical Celsius; the expected string is what the user
  // reads in the active unit.
  const cases: [number, "c" | "f", string][] = [
    [36.77777777777778, "c", "36.78"],
    [36.77777777777778, "f", "98.2"],
    [36.5, "c", "36.5"],
    [36.5, "f", "97.7"],
    [36, "c", "36"],
    [convertToCelsius(97.75, "f"), "f", "97.8"],
    [36.564, "c", "36.56"],
  ];

  for (const [value, unit, expected] of cases) {
    it(`renders ${value} C as ${expected} in ${unit}`, () => {
      expect(formatForDisplay(value, unit)).toBe(expected);
    });
  }

  it("rounds to two decimals in Celsius and one in Fahrenheit", () => {
    expect(formatForDisplay(36.567, "c")).toBe("36.57");
    expect(formatForDisplay(36.49, "f")).toBe("97.7");
  });
});

describe("unit labels and hints", () => {
  it("labels each unit", () => {
    expect(unitLabel("c")).toBe("°C");
    expect(unitLabel("f")).toBe("°F");
  });

  it("states the usual range for the active unit", () => {
    expect(rangeHint("c")).toBe("Usual range 35–38 °C");
    expect(rangeHint("f")).toBe("Usual range 95–100.4 °F");
  });
});

describe("isTemperatureUnit / normalizeTemperatureUnit", () => {
  it("recognises the two units", () => {
    expect(isTemperatureUnit("c")).toBe(true);
    expect(isTemperatureUnit("f")).toBe(true);
    expect(isTemperatureUnit("kelvin")).toBe(false);
    expect(isTemperatureUnit(undefined)).toBe(false);
    expect(isTemperatureUnit(null)).toBe(false);
    expect(isTemperatureUnit(1)).toBe(false);
  });

  it("falls back to Celsius for an unrecognised stored value", () => {
    expect(normalizeTemperatureUnit("c")).toBe("c");
    expect(normalizeTemperatureUnit("f")).toBe("f");
    expect(normalizeTemperatureUnit("kelvin")).toBe("c");
    expect(normalizeTemperatureUnit(undefined)).toBe("c");
    expect(normalizeTemperatureUnit(null)).toBe("c");
  });
});
