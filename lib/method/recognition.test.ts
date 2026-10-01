import assert from "node:assert/strict";
import test from "node:test";

import { recognitionMetabolicReferenceMacros } from "./recognition.ts";

const currentRecognitionBaseline = {
  inputs: {
    weight_kg: { unit: "kg" },
  },
  parameters: {
    protein_per_kg: { value: 2, unit: "g_per_kg" },
    carbohydrate_per_kg: { value: 2, unit: "g_per_kg" },
    fat_daily: { value: 50, unit: "g" },
  },
  outputs: {
    protein_grams: {
      unit: "g",
      expression: {
        op: "multiply",
        args: [
          { op: "input", key: "weight_kg" },
          { op: "parameter", key: "protein_per_kg" },
        ],
      },
    },
    carbohydrate_grams: {
      unit: "g",
      expression: {
        op: "multiply",
        args: [
          { op: "input", key: "weight_kg" },
          { op: "parameter", key: "carbohydrate_per_kg" },
        ],
      },
    },
    fat_grams: {
      unit: "g",
      expression: {
        op: "parameter",
        key: "fat_daily",
      },
    },
  },
};

test("reproduces the current Recognition Metabolic baseline from configuration", () => {
  assert.deepEqual(
    recognitionMetabolicReferenceMacros(currentRecognitionBaseline, 70),
    {
      proteinGrams: 140,
      carbohydrateGrams: 140,
      fatGrams: 50,
    },
  );

  assert.deepEqual(
    recognitionMetabolicReferenceMacros(currentRecognitionBaseline, 82.5),
    {
      proteinGrams: 165,
      carbohydrateGrams: 165,
      fatGrams: 50,
    },
  );
});

test("does not round the weight-based reference", () => {
  assert.deepEqual(
    recognitionMetabolicReferenceMacros(currentRecognitionBaseline, 63.25),
    {
      proteinGrams: 126.5,
      carbohydrateGrams: 126.5,
      fatGrams: 50,
    },
  );
});

test("uses changed professional parameters without changing code", () => {
  const changed = structuredClone(currentRecognitionBaseline);
  changed.parameters.protein_per_kg.value = 1.5;
  changed.parameters.carbohydrate_per_kg.value = 3;
  changed.parameters.fat_daily.value = 60;

  assert.deepEqual(recognitionMetabolicReferenceMacros(changed, 80), {
    proteinGrams: 120,
    carbohydrateGrams: 240,
    fatGrams: 60,
  });
});

test("rejects negative or non-finite weight", () => {
  assert.throws(
    () => recognitionMetabolicReferenceMacros(currentRecognitionBaseline, -1),
    RangeError,
  );
  assert.throws(
    () =>
      recognitionMetabolicReferenceMacros(
        currentRecognitionBaseline,
        Number.NaN,
      ),
    RangeError,
  );
  assert.throws(
    () =>
      recognitionMetabolicReferenceMacros(
        currentRecognitionBaseline,
        Number.POSITIVE_INFINITY,
      ),
    RangeError,
  );
});

test("fails closed when required Recognition outputs are absent", () => {
  assert.throws(
    () =>
      recognitionMetabolicReferenceMacros(
        {
          inputs: { weight_kg: { unit: "kg" } },
          parameters: {},
          outputs: {},
        },
        70,
      ),
    TypeError,
  );
});
