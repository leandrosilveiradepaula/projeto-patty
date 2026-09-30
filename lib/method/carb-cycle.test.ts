import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCarbCyclePhase,
  getCarbCyclePhaseCoefficients,
} from "./carb-cycle.ts";

test("phase 1 reproduces the spreadsheet coefficients and average", () => {
  const result = calculateCarbCyclePhase(60, 1);

  assert.deepEqual(getCarbCyclePhaseCoefficients(1), {
    carbohydrate: [1.55, 1.55, 4.4],
    protein: [2.3, 2.3, 2.3],
  });
  assert.equal(result.carbohydrate.low1Grams, 93);
  assert.equal(result.carbohydrate.low2Grams, 93);
  assert.equal(result.carbohydrate.highGrams, 264);
  assert.equal(result.carbohydrate.linearAverageGrams, 150);
  assert.equal(result.protein.linearAverageGrams, 138);
});

test("phase 2 uses 2.0 g/kg as carbohydrate linear average", () => {
  const result = calculateCarbCyclePhase(77, 2);

  assert.equal(result.carbohydrate.low1Grams, 96.25);
  assert.equal(result.carbohydrate.low2Grams, 96.25);
  assert.equal(result.carbohydrate.highGrams, 269.5);
  assert.equal(result.carbohydrate.linearAverageGrams, 154);
  assert.equal(result.protein.linearAverageGrams, 177.1);
});

test("phase 3 uses 1.5 g/kg as carbohydrate linear average", () => {
  const result = calculateCarbCyclePhase(60, 3);

  assert.equal(result.carbohydrate.low1Grams, 57);
  assert.equal(result.carbohydrate.low2Grams, 57);
  assert.equal(result.carbohydrate.highGrams, 156);
  assert.equal(result.carbohydrate.linearAverageGrams, 90);
  assert.equal(result.protein.linearAverageGrams, 138);
});

test("invalid weight is rejected", () => {
  assert.throws(() => calculateCarbCyclePhase(0, 1));
  assert.throws(() => calculateCarbCyclePhase(Number.NaN, 1));
});
