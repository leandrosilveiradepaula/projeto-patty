import assert from "node:assert/strict";
import test from "node:test";

import {
  parseHydrationClientOverride,
  resolveHydrationConfiguration,
  resolveHydrationTarget,
} from "./hydration-resolution.ts";

const hydrationTemplate = {
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

test("resolves baseline hydration when no client override exists", () => {
  const resolved = resolveHydrationTarget(hydrationTemplate, 70);

  assert.equal(resolved.targetMl, 4200);
  assert.equal(
    resolved.configuration.parameters.daily_ml_per_kg.value,
    60,
  );
});

test("applies the client hydration override without mutating the template", () => {
  const resolved = resolveHydrationTarget(
    hydrationTemplate,
    70,
    {
      parameters: {
        daily_ml_per_kg: {
          value: 55,
          unit: "ml_per_kg",
        },
      },
    },
  );

  assert.equal(resolved.targetMl, 3850);
  assert.equal(
    resolved.configuration.parameters.daily_ml_per_kg.value,
    55,
  );
  assert.equal(hydrationTemplate.parameters.daily_ml_per_kg.value, 60);
});

test("keeps template rounding behavior after a client coefficient override", () => {
  const floorTemplate = structuredClone(hydrationTemplate);
  floorTemplate.outputs.target_ml.expression.op = "floor";

  assert.equal(
    resolveHydrationTarget(
      floorTemplate,
      80.01,
      {
        parameters: {
          daily_ml_per_kg: {
            value: 55,
            unit: "ml_per_kg",
          },
        },
      },
    ).targetMl,
    4400,
  );
});

test("rejects unsupported hydration override keys", () => {
  assert.throws(
    () =>
      parseHydrationClientOverride({
        parameters: {
          daily_ml_per_kg: { value: 55, unit: "ml_per_kg" },
          pure_water_ratio: { value: 0.8, unit: "ratio" },
        },
      }),
    TypeError,
  );
});

test("rejects wrong unit and non-positive hydration overrides", () => {
  assert.throws(
    () =>
      parseHydrationClientOverride({
        parameters: {
          daily_ml_per_kg: { value: 55, unit: "g_per_kg" },
        },
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseHydrationClientOverride({
        parameters: {
          daily_ml_per_kg: { value: 0, unit: "ml_per_kg" },
        },
      }),
    RangeError,
  );
});

test("fails closed if the active template does not support the hydration parameter", () => {
  const incompatibleTemplate = {
    inputs: {
      weight_kg: { unit: "kg" },
    },
    parameters: {},
    outputs: {
      target_ml: {
        unit: "ml",
        expression: {
          op: "round",
          arg: {
            op: "input",
            key: "weight_kg",
          },
        },
      },
    },
  };

  assert.throws(() =>
    resolveHydrationConfiguration(
      incompatibleTemplate,
      {
        parameters: {
          daily_ml_per_kg: { value: 55, unit: "ml_per_kg" },
        },
      },
    ),
  );
});
