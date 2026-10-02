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
      carbohydratePerKg: 1.55,
      proteinPerKg: 2.3,
    },
    {
      key: "low_2",
      label: "Low 2",
      carbohydratePerKg: 1.55,
      proteinPerKg: 2.3,
    },
    {
      key: "high",
      label: "High",
      carbohydratePerKg: 4.4,
      proteinPerKg: 2.3,
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
      carbohydratePerKg: 1.25,
      proteinPerKg: 2.3,
    },
    {
      key: "low_2",
      label: "Low 2",
      carbohydratePerKg: 1.25,
      proteinPerKg: 2.3,
    },
    {
      key: "high",
      label: "High",
      carbohydratePerKg: 3.5,
      proteinPerKg: 2.3,
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
      carbohydratePerKg: 0.95,
      proteinPerKg: 2.3,
    },
    {
      key: "low_2",
      label: "Low 2",
      carbohydratePerKg: 0.95,
      proteinPerKg: 2.3,
    },
    {
      key: "high",
      label: "High",
      carbohydratePerKg: 2.6,
      proteinPerKg: 2.3,
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
  changed.steps[0].carbohydratePerKg = 1.4;

  const result = calculateCarbCycle(changed, 60);
  assert.equal(result.steps[0].carbohydrateGrams, 84);
});

test("does not assume exactly three steps", () => {
  const changed = structuredClone(phase1);
  changed.steps.push({
    key: "recovery",
    label: "Recovery",
    carbohydratePerKg: 2,
    proteinPerKg: 2.1,
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
  invalid.steps[0].proteinPerKg = Number.NaN;
  assert.throws(() => parseCarbCycleConfiguration(invalid), TypeError);
});

test("rejects non-positive or non-finite weight", () => {
  assert.throws(() => calculateCarbCycle(phase1, 0), RangeError);
  assert.throws(() => calculateCarbCycle(phase1, -1), RangeError);
  assert.throws(() => calculateCarbCycle(phase1, Number.NaN), RangeError);
});
