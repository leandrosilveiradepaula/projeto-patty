import assert from "node:assert/strict";
import test from "node:test";

import { vegetableCarbohydrateDoseEquivalent } from "./vegetable-carb.ts";

const currentBaseline = {
  inputs: {
    vegetable_doses: { unit: "dose" },
  },
  parameters: {
    vegetable_doses_per_carbohydrate_dose: {
      value: 2,
      unit: "ratio",
    },
  },
  outputs: {
    carbohydrate_dose_equivalent: {
      unit: "dose",
      expression: {
        op: "divide",
        args: [
          { op: "input", key: "vegetable_doses" },
          {
            op: "parameter",
            key: "vegetable_doses_per_carbohydrate_dose",
          },
        ],
      },
    },
  },
};

test("reproduces the confirmed vegetable-to-carbohydrate equivalence", () => {
  assert.equal(
    vegetableCarbohydrateDoseEquivalent(currentBaseline, 2),
    1,
  );
  assert.equal(
    vegetableCarbohydrateDoseEquivalent(currentBaseline, 4),
    2,
  );
  assert.equal(
    vegetableCarbohydrateDoseEquivalent(currentBaseline, 1),
    0.5,
  );
});

test("uses a changed conversion without changing runtime code", () => {
  const changed = structuredClone(currentBaseline);
  changed.parameters.vegetable_doses_per_carbohydrate_dose.value = 3;

  assert.equal(
    vegetableCarbohydrateDoseEquivalent(changed, 3),
    1,
  );
  assert.equal(
    vegetableCarbohydrateDoseEquivalent(changed, 6),
    2,
  );
});

test("rejects negative or non-finite vegetable doses", () => {
  assert.throws(
    () => vegetableCarbohydrateDoseEquivalent(currentBaseline, -1),
    RangeError,
  );
  assert.throws(
    () =>
      vegetableCarbohydrateDoseEquivalent(
        currentBaseline,
        Number.NaN,
      ),
    RangeError,
  );
});

test("fails closed for a zero conversion ratio", () => {
  const invalid = structuredClone(currentBaseline);
  invalid.parameters.vegetable_doses_per_carbohydrate_dose.value = 0;

  assert.throws(
    () => vegetableCarbohydrateDoseEquivalent(invalid, 2),
    /division by zero/i,
  );
});

test("fails closed when the expected output is absent", () => {
  assert.throws(
    () =>
      vegetableCarbohydrateDoseEquivalent(
        {
          inputs: {
            vegetable_doses: { unit: "dose" },
          },
          parameters: {},
          outputs: {},
        },
        2,
      ),
    TypeError,
  );
});

test("vegetable conversion rejects negative configured output", () => {
  const invalid = structuredClone(currentBaseline);
  invalid.parameters.vegetable_doses_per_carbohydrate_dose.value = -2;
  assert.throws(() => vegetableCarbohydrateDoseEquivalent(invalid, 2), /non-negative/);
});
