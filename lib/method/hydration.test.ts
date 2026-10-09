import assert from "node:assert/strict";
import test from "node:test";

import { hydrationDailyTargetMl } from "./hydration.ts";

const currentHydrationBaseline = {
  inputs: {
    weight_kg: { unit: "kg" },
  },
  parameters: {
    daily_ml_per_kg: { value: 60, unit: "ml_per_kg" },
  },
  outputs: {
    target_ml: {
      unit: "ml",
      expression: {
        op: "round",
        arg: {
          op: "multiply",
          args: [
            { op: "input", key: "weight_kg" },
            { op: "parameter", key: "daily_ml_per_kg" },
          ],
        },
      },
    },
  },
};

test("reproduces the current hydration baseline from explicit configuration", () => {
  assert.equal(hydrationDailyTargetMl(currentHydrationBaseline, 60), 3600);
  assert.equal(hydrationDailyTargetMl(currentHydrationBaseline, 82.5), 4950);
  assert.equal(hydrationDailyTargetMl(currentHydrationBaseline, 80.01), 4801);
});

test("uses a changed hydration coefficient without code changes", () => {
  const changed = structuredClone(currentHydrationBaseline);
  changed.parameters.daily_ml_per_kg.value = 55;

  assert.equal(hydrationDailyTargetMl(changed, 70), 3850);
});

test("keeps hydration rounding behavior in configuration", () => {
  const floorConfigured = structuredClone(currentHydrationBaseline);
  floorConfigured.outputs.target_ml.expression.op = "floor";

  assert.equal(hydrationDailyTargetMl(floorConfigured, 80.01), 4800);
});

test("rejects non-positive or non-finite weight", () => {
  assert.throws(
    () => hydrationDailyTargetMl(currentHydrationBaseline, 0),
    RangeError,
  );
  assert.throws(
    () => hydrationDailyTargetMl(currentHydrationBaseline, -1),
    RangeError,
  );
  assert.throws(
    () => hydrationDailyTargetMl(currentHydrationBaseline, Number.NaN),
    RangeError,
  );
  assert.throws(
    () =>
      hydrationDailyTargetMl(
        currentHydrationBaseline,
        Number.POSITIVE_INFINITY,
      ),
    RangeError,
  );
});

test("fails closed when the hydration output is absent", () => {
  assert.throws(
    () =>
      hydrationDailyTargetMl(
        {
          inputs: {
            weight_kg: { unit: "kg" },
          },
          parameters: {},
          outputs: {},
        },
        60,
      ),
    TypeError,
  );
});

test("hydration rejects negative configured target outputs", () => {
  const invalid = structuredClone(currentHydrationBaseline);
  invalid.parameters.daily_ml_per_kg.value = -5;
  assert.throws(() => hydrationDailyTargetMl(invalid, 60), /non-negative/);
});

test("hydration rejects target arithmetic overflow", () => {
  assert.throws(() => hydrationDailyTargetMl(currentHydrationBaseline, 1e308), /finite/);
});
