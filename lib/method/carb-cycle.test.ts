import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCarbCycle,
  parseCarbCycleConfiguration,
} from "./carb-cycle.ts";

const phase1 = {
  phaseKey: "phase_1",
  steps: [
    {
      key: "low_1",
      label: "Low 1",
      carbohydratePerKg: { value: 1.55, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
    {
      key: "low_2",
      label: "Low 2",
      carbohydratePerKg: { value: 1.55, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
    {
      key: "high",
      label: "High",
      carbohydratePerKg: { value: 4.4, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
  ],
  linearAverageStepKeys: ["low_1", "low_2", "high"],
};

const phase2 = {
  phaseKey: "phase_2",
  steps: [
    {
      key: "low_1",
      label: "Low 1",
      carbohydratePerKg: { value: 1.25, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
    {
      key: "low_2",
      label: "Low 2",
      carbohydratePerKg: { value: 1.25, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
    {
      key: "high",
      label: "High",
      carbohydratePerKg: { value: 3.5, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
  ],
  linearAverageStepKeys: ["low_1", "low_2", "high"],
};

const phase3 = {
  phaseKey: "phase_3",
  steps: [
    {
      key: "low_1",
      label: "Low 1",
      carbohydratePerKg: { value: 0.95, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
    {
      key: "low_2",
      label: "Low 2",
      carbohydratePerKg: { value: 0.95, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
    {
      key: "high",
      label: "High",
      carbohydratePerKg: { value: 2.6, unit: "g_per_kg" },
      proteinPerKg: { value: 2.3, unit: "g_per_kg" },
    },
  ],
  linearAverageStepKeys: ["low_1", "low_2", "high"],
};

test("phase 1 reproduces the current spreadsheet-derived baseline", () => {
  const result = calculateCarbCycle(phase1, 60);

  assert.deepEqual(
    result.steps.map((step) => ({
      key: step.key,
      carbohydrateGrams: step.carbohydrateGrams,
      proteinGrams: step.proteinGrams,
    })),
    [
      { key: "low_1", carbohydrateGrams: 93, proteinGrams: 138 },
      { key: "low_2", carbohydrateGrams: 93, proteinGrams: 138 },
      { key: "high", carbohydrateGrams: 264, proteinGrams: 138 },
    ],
  );
  assert.equal(result.linearAverage.carbohydrateGrams, 150);
  assert.equal(result.linearAverage.proteinGrams, 138);
});

test("phase 2 reproduces the current linear average", () => {
  const result = calculateCarbCycle(phase2, 77);
  assert.equal(result.linearAverage.carbohydrateGrams, 154);
  assert.equal(result.linearAverage.proteinGrams, 177.1);
});

test("phase 3 reproduces the current linear average", () => {
  const result = calculateCarbCycle(phase3, 60);
  assert.equal(result.linearAverage.carbohydrateGrams, 90);
  assert.equal(result.linearAverage.proteinGrams, 138);
});

test("supports a changed coefficient without changing runtime code", () => {
  const changed = structuredClone(phase1);
  changed.steps[0].carbohydratePerKg.value = 1.4;

  const result = calculateCarbCycle(changed, 60);
  assert.equal(result.steps[0].carbohydrateGrams, 84);
});

test("does not assume exactly three steps", () => {
  const changed = structuredClone(phase1);
  changed.steps.push({
    key: "recovery",
    label: "Recovery",
    carbohydratePerKg: { value: 2, unit: "g_per_kg" },
    proteinPerKg: { value: 2.1, unit: "g_per_kg" },
  });
  changed.linearAverageStepKeys = ["low_1", "high", "recovery"];

  const result = calculateCarbCycle(changed, 60);
  assert.equal(result.steps.length, 4);
  assert.equal(result.linearAverage.carbohydrateGrams, 159);
  assert.equal(result.linearAverage.proteinGrams, 134);
});

test("rejects malformed configuration and unknown average steps", () => {
  assert.throws(
    () =>
      parseCarbCycleConfiguration({
        phaseKey: "phase_x",
        steps: [],
        linearAverageStepKeys: ["low"],
      }),
    TypeError,
  );

  const changed = structuredClone(phase1);
  changed.linearAverageStepKeys = ["missing"];
  assert.throws(() => parseCarbCycleConfiguration(changed), TypeError);
});

test("rejects duplicate step keys and invalid coefficients", () => {
  const duplicate = structuredClone(phase1);
  duplicate.steps[1].key = "low_1";
  assert.throws(() => parseCarbCycleConfiguration(duplicate), TypeError);

  const invalid = structuredClone(phase1);
  invalid.steps[0].proteinPerKg.value = Number.NaN;
  assert.throws(() => parseCarbCycleConfiguration(invalid), TypeError);
});

test("rejects non-positive or non-finite weight", () => {
  assert.throws(() => calculateCarbCycle(phase1, 0), RangeError);
  assert.throws(() => calculateCarbCycle(phase1, -1), RangeError);
  assert.throws(() => calculateCarbCycle(phase1, Number.NaN), RangeError);
});


test("rejects coefficient units that do not match g_per_kg", () => {
  const invalid = structuredClone(phase1);
  invalid.steps[0].carbohydratePerKg.unit = "ratio";

  assert.throws(() => parseCarbCycleConfiguration(invalid), TypeError);
});

test("carb cycle rejects unsafe phase identifiers", () => {
  for (const phaseKey of ["Upper", "two words", "1start", "x".repeat(121), "phase/1"]) {
    assert.throws(() => parseCarbCycleConfiguration({ ...phase1, phaseKey }), TypeError);
  }
});

test("carb cycle rejects unsafe step identifiers", () => {
  for (const key of ["Upper", "two words", "1start", "x".repeat(121), "step/1"]) {
    const changed = structuredClone(phase1);
    changed.steps[0].key = key;
    assert.throws(() => parseCarbCycleConfiguration(changed), TypeError);
  }
});

test("carb cycle rejects malformed average step identifiers", () => {
  const changed = structuredClone(phase1);
  changed.linearAverageStepKeys = ["low_1 "];
  assert.throws(() => parseCarbCycleConfiguration(changed), TypeError);
});

test("carb cycle rejects oversized labels and control characters", () => {
  for (const label of ["x".repeat(201), "Low\u0000day", " Low"]) {
    const changed = structuredClone(phase1);
    changed.steps[0].label = label;
    assert.throws(() => parseCarbCycleConfiguration(changed), TypeError);
  }
});

test("carb cycle rejects overflowing step calculations", () => {
  const changed = structuredClone(phase1);
  changed.steps[0].carbohydratePerKg.value = 1e308;
  assert.throws(() => calculateCarbCycle(changed, 10), /finite/);
});

test("carb cycle rejects overflowing average calculations", () => {
  const changed = structuredClone(phase1);
  for (const step of changed.steps) {
    step.carbohydratePerKg.value = 1e308;
  }
  assert.throws(() => calculateCarbCycle(changed, 1), /finite/);
});

test("carb cycle preserves configurable safe identifiers and labels", () => {
  const changed = structuredClone(phase1);
  changed.phaseKey = "phase_custom";
  changed.steps[0].key = "low_custom";
  changed.steps[0].label = "Low custom";
  changed.linearAverageStepKeys[0] = "low_custom";
  assert.equal(calculateCarbCycle(changed, 60).phaseKey, "phase_custom");
});

test("carb cycle rejects unbounded step collections", () => {
  const changed = structuredClone(phase1);
  changed.steps = Array.from({ length: 129 }, (_, i) => ({
    ...structuredClone(phase1.steps[0]), key: "step_" + i,
  }));
  assert.throws(() => parseCarbCycleConfiguration(changed), /maximum step count/);
});

test("carb cycle rejects average reference lists longer than available steps", () => {
  const changed = structuredClone(phase1);
  changed.linearAverageStepKeys = ["low_1", "low_2", "high", "low_1"];
  assert.throws(() => parseCarbCycleConfiguration(changed), /exceed available steps/);
});

test("carb cycle continues to allow configurable steps within bounds", () => {
  const changed = structuredClone(phase1);
  changed.steps.push({
    key: "recovery", label: "Recovery",
    carbohydratePerKg: { value: 2, unit: "g_per_kg" },
    proteinPerKg: { value: 2.1, unit: "g_per_kg" },
  });
  assert.equal(parseCarbCycleConfiguration(changed).steps.length, 4);
});
