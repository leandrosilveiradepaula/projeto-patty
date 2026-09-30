import assert from "node:assert/strict";
import test from "node:test";

import { calculateCarbCycle } from "./carb-cycle.ts";

test("phase 3 reproduces the spreadsheet coefficients at 77 kg", () => {
  const result = calculateCarbCycle(77, 3);

  assert.equal(result.carbLowDay1Grams, 73.15);
  assert.equal(result.carbLowDay2Grams, 73.15);
  assert.equal(result.carbHighDayGrams, 200.2);
  assert.equal(result.carbLinearGrams, 115.5);
  assert.equal(result.proteinGrams, 177.1);
});

test("linear reference follows the spreadsheet Media column", () => {
  assert.equal(calculateCarbCycle(60, 1).carbLinearGrams, 150);
  assert.equal(calculateCarbCycle(60, 2).carbLinearGrams, 120);
  assert.equal(calculateCarbCycle(60, 3).carbLinearGrams, 90);
  assert.equal(calculateCarbCycle(60, 4).carbLinearGrams, 60);
});

test("invalid weight is rejected", () => {
  assert.throws(() => calculateCarbCycle(0, 1));
  assert.throws(() => calculateCarbCycle(Number.NaN, 1));
});
