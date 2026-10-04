import assert from "node:assert/strict";
import test from "node:test";

import {
  formatConfigurationParameterKey,
  formatConfigurationUnit,
  listEditableNumericParameters,
  updateEditableNumericParameters,
} from "./editable-numeric.ts";

test("extracts and updates scalar parameters without changing the unit", () => {
  const original = { value: 24, unit: "hour" };

  assert.deepEqual(
    listEditableNumericParameters("scalar_parameter_v1", original),
    [{ key: "value", unit: "hour", value: 24 }],
  );

  assert.deepEqual(
    updateEditableNumericParameters("scalar_parameter_v1", original, {
      value: 48,
    }),
    { value: 48, unit: "hour" },
  );

  assert.deepEqual(original, { value: 24, unit: "hour" });
});

test("updates only method-engine parameter values and preserves expressions", () => {
  const original = {
    inputs: { weight_kg: { unit: "kg" } },
    parameters: {
      daily_ml_per_kg: { value: 35, unit: "ml_per_kg" },
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

  assert.deepEqual(
    listEditableNumericParameters("method_engine_v1", original),
    [{ key: "daily_ml_per_kg", unit: "ml_per_kg", value: 35 }],
  );

  const updated = updateEditableNumericParameters(
    "method_engine_v1",
    original,
    { daily_ml_per_kg: 40 },
  );

  assert.equal(
    (updated as typeof original).parameters.daily_ml_per_kg.value,
    40,
  );
  assert.deepEqual(
    (updated as typeof original).outputs,
    original.outputs,
  );
  assert.equal(original.parameters.daily_ml_per_kg.value, 35);
});

test("requires the exact editable parameter set", () => {
  const original = {
    inputs: {},
    parameters: {
      first: { value: 1, unit: "count" },
      second: { value: 2, unit: "count" },
    },
    outputs: {},
  };

  assert.throws(
    () =>
      updateEditableNumericParameters("method_engine_v1", original, {
        first: 3,
      }),
    /conjunto de parâmetros/i,
  );

  assert.throws(
    () =>
      updateEditableNumericParameters("method_engine_v1", original, {
        first: 3,
        second: Number.NaN,
      }),
    /parâmetro numérico/i,
  );

  assert.throws(
    () =>
      updateEditableNumericParameters("method_engine_v1", original, {
        first: 3,
        second: 0,
      }),
    /maior que zero/i,
  );
});

test("does not expose structured schemas through the numeric editor", () => {
  assert.deepEqual(
    listEditableNumericParameters("carb_cycle_v1", {
      phaseKey: "phase_1",
      steps: [],
      linearAverageStepKeys: [],
    }),
    [],
  );

  assert.throws(
    () =>
      updateEditableNumericParameters(
        "liquid_taxonomy_v1",
        { kinds: [] },
        {},
      ),
    /editor numérico seguro/i,
  );
});

test("formats known units and parameter labels for the admin UI", () => {
  assert.equal(formatConfigurationUnit("ml_per_kg"), "mL/kg");
  assert.equal(
    formatConfigurationParameterKey("daily_ml_per_kg"),
    "Líquidos por kg/dia",
  );
  assert.equal(
    formatConfigurationParameterKey("custom_parameter"),
    "Custom Parameter",
  );
});
