import assert from "node:assert/strict";
import test from "node:test";

import { resolveMethodEngineConfiguration } from "./config-resolution.ts";

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

test("returns a validated template when there are no overrides", () => {
  const resolved = resolveMethodEngineConfiguration(hydrationBase, []);

  assert.equal(
    resolved.configuration.parameters.daily_ml_per_kg.value,
    60,
  );
  assert.deepEqual(resolved.appliedOverrideIds, []);
});

test("applies ordered partial overrides without mutating the template", () => {
  const resolved = resolveMethodEngineConfiguration(hydrationBase, [
    {
      id: "client-override",
      configuration: {
        parameters: {
          daily_ml_per_kg: {
            value: 55,
          },
        },
      },
    },
    {
      id: "more-specific-override",
      configuration: {
        parameters: {
          daily_ml_per_kg: {
            value: 50,
          },
        },
      },
    },
  ]);

  assert.equal(
    resolved.configuration.parameters.daily_ml_per_kg.value,
    50,
  );
  assert.equal(hydrationBase.parameters.daily_ml_per_kg.value, 60);
  assert.deepEqual(resolved.appliedOverrideIds, [
    "client-override",
    "more-specific-override",
  ]);
});

test("can replace a configured formula operator and is revalidated", () => {
  const resolved = resolveMethodEngineConfiguration(hydrationBase, [
    {
      id: "rounding-override",
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
  ]);

  assert.equal(
    resolved.configuration.outputs.target_ml.expression.op,
    "floor",
  );
});

test("rejects unknown fields instead of silently widening configuration", () => {
  assert.throws(
    () =>
      resolveMethodEngineConfiguration(hydrationBase, [
        {
          id: "invalid",
          configuration: {
            parameters: {
              unknown_parameter: {
                value: 1,
                unit: "ratio",
              },
            },
          },
        },
      ]),
    TypeError,
  );
});

test("rejects an override that makes the engine configuration invalid", () => {
  assert.throws(
    () =>
      resolveMethodEngineConfiguration(hydrationBase, [
        {
          id: "invalid-unit",
          configuration: {
            parameters: {
              daily_ml_per_kg: {
                unit: "g",
              },
            },
          },
        },
      ]),
  );
});

test("rejects blank override identities and non-object patches", () => {
  assert.throws(
    () =>
      resolveMethodEngineConfiguration(hydrationBase, [
        { id: "", configuration: {} },
      ]),
    TypeError,
  );

  assert.throws(
    () =>
      resolveMethodEngineConfiguration(hydrationBase, [
        { id: "bad", configuration: 55 },
      ]),
    TypeError,
  );
});
