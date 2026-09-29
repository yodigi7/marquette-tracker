import { describe, expect, it } from "vitest";
import {
  CALENDAR_LAYER_IDS,
  normalizeCalendarLayerIds,
  type CalendarLayerId,
} from "@/core/store/entities";
import {
  CALENDAR_LAYERS,
  hiddenOutsideOffered,
  isLayerShown,
  LAYER_GROUPS,
  LAYER_PAINT,
  offeredLayers,
  PROJECTED_CYCLE_START_LAYER,
  swatchSample,
  toggleLayer,
} from "../layers";

const ALL = { interpreted: true, detailMode: "full" } as const;
const ALGORITHM_OFF = { interpreted: false, detailMode: "full" } as const;
const SIMPLE = { interpreted: true, detailMode: "simple" } as const;

function ids(options: Parameters<typeof offeredLayers>[0]): string[] {
  return offeredLayers(options).map((layer) => layer.id);
}

/** The declared key for a phase layer, which is what the legend actually renders. */
function phase(id: "before" | "fertile" | "after") {
  return CALENDAR_LAYERS.find((layer) => layer.id === id)!;
}

describe("the layer declaration", () => {
  it("covers exactly the recognised layer ids, in order and without duplicates", () => {
    expect(CALENDAR_LAYERS.map((layer) => layer.id)).toEqual([...CALENDAR_LAYER_IDS]);
  });

  it("gives every layer a label, a group, a footprint, and something to draw", () => {
    for (const layer of CALENDAR_LAYERS) {
      expect(layer.label, `${layer.id} label`).not.toBe("");
      expect(LAYER_GROUPS, `${layer.id} group`).toContain(layer.group);
      expect(layer.footprint, `${layer.id} footprint`).not.toBe("");
      // Every layer paints something, and the swatch can show it.
      const paint = LAYER_PAINT[layer.id];
      const paints = paint.fill !== "" || paint.border !== "" || paint.marker !== "";
      expect(paints, `${layer.id} paints nothing`).toBe(true);
      expect(swatchSample(layer), `${layer.id} swatch is empty`).not.toBe("");
    }
  });

  it("describes the predictive layer with the dashed cue projected days carry", () => {
    const predicted = CALENDAR_LAYERS.find((layer) => layer.id === "predicted")!;
    expect(LAYER_PAINT.predicted.border).toContain("border-fertility-forecast-border");
    expect(LAYER_PAINT.predicted.border).toContain("border-dashed");
    expect(swatchSample(predicted)).toContain("border-fertility-forecast-border");
  });

  it("paints a bar for the window and only a tint for the two quiet phases", () => {
    for (const id of ["before", "after"] as const) {
      expect(LAYER_PAINT[id].bar, `${id} bar`).toBe("");
      expect(swatchSample(phase(id)), `${id} sample`).toContain(LAYER_PAINT[id].fill);
    }
    expect(swatchSample(phase("fertile")), "the key shows the bar").toBe(LAYER_PAINT.fertile.bar);
  });

  it("gives all three phase keys the same footprint", () => {
    // The colours are what tell the phases apart. Drawing the window's key at a different size made it
    // read as a claim about importance rather than about the treatment, and it is the key most often
    // compared against its two neighbours.
    const sizes = (["before", "fertile", "after"] as const).map((id) => phase(id).footprint);
    expect(new Set(sizes).size, `phase key sizes: ${sizes.join(" / ")}`).toBe(1);
  });

  it("draws a bar on no layer but the window", () => {
    // The predictive, menses, and reading-marker layers are not phases, and a bar on any of them would
    // read as a window where there is none.
    for (const id of ["predicted", "menses", "low", "high", "peak", "intercourse"] as const) {
      expect(LAYER_PAINT[id].bar, `${id} bar`).toBe("");
    }
  });

  it("takes a swatch's shape from the layer and its colour from the paint, never both", () => {
    // The two used to be chosen independently, in `swatchSample` and in the layer declaration, so a key
    // could show a bar for a tint and still pass every test on the record it read from.
    for (const layer of CALENDAR_LAYERS) {
      const sample = swatchSample(layer);
      for (const shape of ["h-1 w-6", "h-3 w-5", "rounded-full", "border-2"]) {
        expect(sample, `${layer.id} sample must not carry its own shape`).not.toContain(shape);
      }
    }
  });

  it("gives every layer a swatch built from the same paint the cell uses", () => {
    // The legend composes its sample from LAYER_PAINT, so a sample cannot name
    // a colour the day cell does not paint.
    for (const layer of CALENDAR_LAYERS) {
      const paint = LAYER_PAINT[layer.id];
      const sample = swatchSample(layer);
      if (paint.fill !== "") {
        expect(sample, `${layer.id} fill`).toContain(paint.fill);
        if (paint.border !== "") {
          expect(sample, `${layer.id} border`).toContain(paint.border);
        }
      } else {
        expect(sample, `${layer.id} marker`).toBe(paint.marker);
      }
    }
  });

  it("attributes the predicted cycle-start stripe to the predictive layer, not menses", () => {
    expect(PROJECTED_CYCLE_START_LAYER).toBe("predicted");
    expect(PROJECTED_CYCLE_START_LAYER).not.toBe("menses");
  });
});

describe("which keys the legend offers", () => {
  it("offers every layer when interpretation and full detail are both active", () => {
    expect(ids(ALL)).toEqual([...CALENDAR_LAYER_IDS]);
  });

  it("withdraws the derived keys when the algorithm is off but keeps the raw ones", () => {
    // Intercourse stays: the day cell paints the heart in full detail whatever
    // the algorithm is set to, so withdrawing its key would leave a painted
    // treatment that nothing explains.
    expect(ids(ALGORITHM_OFF)).toEqual(["menses", "low", "high", "peak", "intercourse"]);
    expect(ids(ALGORITHM_OFF)).not.toContain("predicted");
  });

  it("withdraws the intercourse key unless the presentation is full detail", () => {
    expect(ids(SIMPLE)).toEqual([
      "before",
      "fertile",
      "after",
      "predicted",
      "menses",
      "low",
      "high",
      "peak",
    ]);
  });

  it("still offers only the raw keys with the algorithm off in the simple presentation", () => {
    expect(ids({ interpreted: false, detailMode: "simple" })).toEqual([
      "menses",
      "low",
      "high",
      "peak",
    ]);
  });
});

describe("layer visibility", () => {
  it("treats an absent id as shown", () => {
    expect(isLayerShown([], "menses")).toBe(true);
    expect(isLayerShown(["menses"], "menses")).toBe(false);
  });

  it("hides then restores one layer without touching the others", () => {
    const hidden = toggleLayer([], "menses");
    expect(hidden).toEqual(["menses"]);
    expect(toggleLayer(hidden, "menses")).toEqual([]);
  });

  it("keeps other layers hidden when one is toggled back", () => {
    const hidden = toggleLayer(toggleLayer([], "menses"), "fertile");
    expect(hidden).toEqual(["menses", "fertile"]);
    expect(toggleLayer(hidden, "menses")).toEqual(["fertile"]);
  });

  it("keeps only the withdrawn keys hidden when the rest are restored", () => {
    // Menses is on screen with the algorithm off, so it is restored; Fertile is
    // not on screen, so its stored choice survives.
    const hidden: CalendarLayerId[] = ["menses", "fertile"];
    expect(hiddenOutsideOffered(hidden, offeredLayers(ALGORITHM_OFF))).toEqual(["fertile"]);
  });

  it("leaves a stored choice for a withdrawn key alone", () => {
    const hidden: CalendarLayerId[] = ["menses", "fertile"];
    expect(hiddenOutsideOffered(hidden, offeredLayers(ALGORITHM_OFF))).not.toContain("menses");
    // The caller's stored value is untouched, so it is still there when the key returns.
    expect(hidden).toEqual(["menses", "fertile"]);
  });

  it("clears everything when every key is on screen", () => {
    expect(hiddenOutsideOffered(["menses", "fertile"], offeredLayers(ALL))).toEqual([]);
  });

  it("cannot reintroduce an unrecognised id", () => {
    // Unrecognised ids are filtered on read, so a reset cannot bring one back.
    const stored = normalizeCalendarLayerIds(["menses", "a-layer-from-another-version"]);
    expect(stored).toEqual(["menses"]);
    expect(hiddenOutsideOffered(stored, offeredLayers(ALL))).toEqual([]);
  });
});

describe("the declaration and the day cell agree", () => {
  it("offers one key per layer, so no key can be a control that does nothing", () => {
    for (const options of [
      { interpreted: true, detailMode: "full" },
      { interpreted: true, detailMode: "simple" },
      { interpreted: false, detailMode: "full" },
      { interpreted: false, detailMode: "simple" },
    ] as const) {
      const offered = offeredLayers(options);
      expect(new Set(offered.map((l) => l.id)).size).toBe(offered.length);
      for (const layer of offered) {
        expect(CALENDAR_LAYER_IDS, `${layer.id} is a recognised id`).toContain(layer.id);
      }
    }
  });

  it("routes each painted treatment to a declared layer", () => {
    // The day cell paints exactly these, and each maps to a declared id. A new
    // treatment with no id here is the drift this guards against.
    const painted: Array<[string, string]> = [
      ["phase fill before", "before"],
      ["phase fill fertile", "fertile"],
      ["phase fill after", "after"],
      ["forecast fill and dashed border", "predicted"],
      ["menses stripe", "menses"],
      ["monitor dot low", "low"],
      ["monitor dot high", "high"],
      ["monitor dot peak", "peak"],
      ["intercourse icon", "intercourse"],
    ];
    for (const [treatment, id] of painted) {
      expect(CALENDAR_LAYER_IDS, `${treatment} has no declared layer`).toContain(id);
    }
    expect(painted).toHaveLength(CALENDAR_LAYER_IDS.length);
  });
});
