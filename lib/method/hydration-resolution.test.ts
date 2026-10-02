import assert from "node:assert/strict";
import test from "node:test";

import { resolveHydrationTarget } from "./hydration-resolution.ts";

const hydrationBase = {
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

test("resolves the template baseline and evaluates the hydration result", () => {
  const result = resolveHydrationTarget({
    templateConfiguration: hydrationBase,
    weightKg: 60,
  });

  assert.equal(result.targetMl, 3600);
  assert.deepEqual(result.appliedOverrideIds, []);
});

test("resolves a client-specific coefficient override deterministically", () => {
  const result = resolveHydrationTarget({
    templateConfiguration: hydrationBase,
    overrides: [
      {
        id: "override-55",
        configuration: {
          parameters: {
            daily_ml_per_kg: {
              value: 55,
            },
          },
        },
      },
    ],
    weightKg: 70,
  });

  assert.equal(result.targetMl, 3850);
  assert.deepEqual(result.appliedOverrideIds, ["override-55"]);
});

test("resolves formula changes only when the resulting engine config is valid", () => {
  const result = resolveHydrationTarget({
    templateConfiguration: hydrationBase,
    overrides: [
      {
        id: "floor",
        configuration: {
          outputs: {
            target_ml: {
              expression: {
                op: "floor",
              },
            },
          },
        },
      },
    ],
    weightKg: 80.01,
  });

  assert.equal(result.targetMl, 4800);
});
