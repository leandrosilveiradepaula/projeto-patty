import assert from "node:assert/strict";
import test from "node:test";

import {
  dosesToGrams,
  gramsPerDose,
  gramsToDoses,
  maxHigherFatProteinDoses,
  parseDoseGramConfiguration,
} from "./doses.ts";

const proteinDose = { value: 15, unit: "g_per_dose" };
const carbohydrateDose = { value: 12, unit: "g_per_dose" };
const fatDose = { value: 6, unit: "g_per_dose" };

const higherFatProteinLimitBaseline = {
  inputs: {
    total_protein_doses: { unit: "dose" },
  },
  parameters: {
    higher_fat_ratio: { value: 0.5, unit: "ratio" },
  },
  outputs: {
    max_higher_fat_protein_doses: {
      unit: "dose",
      expression: {
        op: "ceil",
        arg: {
          op: "multiply",
          args: [
            { op: "input", key: "total_protein_doses" },
            { op: "parameter", key: "higher_fat_ratio" },
          ],
        },
      },
    },
  },
};

test("reproduces the current dose baselines from explicit configuration", () => {
  assert.equal(gramsPerDose(proteinDose), 15);
  assert.equal(gramsPerDose(carbohydrateDose), 12);
  assert.equal(gramsPerDose(fatDose), 6);

  assert.equal(dosesToGrams(proteinDose, 2), 30);
  assert.equal(dosesToGrams(carbohydrateDose, 2.5), 30);
  assert.equal(dosesToGrams(fatDose, 0.5), 3);

  assert.equal(gramsToDoses(proteinDose, 30), 2);
  assert.equal(gramsToDoses(carbohydrateDose, 6), 0.5);
  assert.equal(gramsToDoses(fatDose, 3), 0.5);
});

test("uses changed configuration without code changes", () => {
  const changedProteinDose = { value: 18, unit: "g_per_dose" };

  assert.equal(gramsPerDose(changedProteinDose), 18);
  assert.equal(dosesToGrams(changedProteinDose, 2), 36);
  assert.equal(gramsToDoses(changedProteinDose, 9), 0.5);
});

test("rejects malformed or unit-mismatched dose configuration", () => {
  assert.throws(
    () => parseDoseGramConfiguration({ value: 15, unit: "g" }),
    TypeError,
  );
  assert.throws(
    () => parseDoseGramConfiguration({ value: Number.NaN, unit: "g_per_dose" }),
    TypeError,
  );
  assert.throws(
    () =>
      parseDoseGramConfiguration({
        value: 15,
        unit: "g_per_dose",
        extra: true,
      }),
    TypeError,
  );
});

test("rejects negative or non-finite dose and gram values", () => {
  assert.throws(() => dosesToGrams(proteinDose, -1), RangeError);
  assert.throws(() => dosesToGrams(fatDose, Number.NaN), RangeError);
  assert.throws(() => gramsToDoses(proteinDose, -1), RangeError);
  assert.throws(
    () => gramsToDoses(fatDose, Number.POSITIVE_INFINITY),
    RangeError,
  );
  assert.throws(
    () => gramsToDoses({ value: 0, unit: "g_per_dose" }, 1),
    RangeError,
  );
});

test("reproduces the current higher-fat protein limit from configuration", () => {
  assert.equal(maxHigherFatProteinDoses(higherFatProteinLimitBaseline, 8), 4);
  assert.equal(maxHigherFatProteinDoses(higherFatProteinLimitBaseline, 7), 4);
  assert.equal(maxHigherFatProteinDoses(higherFatProteinLimitBaseline, 9), 5);
  assert.equal(maxHigherFatProteinDoses(higherFatProteinLimitBaseline, 7.5), 4);
  assert.equal(maxHigherFatProteinDoses(higherFatProteinLimitBaseline, 8.5), 5);
  assert.equal(maxHigherFatProteinDoses(higherFatProteinLimitBaseline, 0), 0);
  assert.equal(maxHigherFatProteinDoses(higherFatProteinLimitBaseline, 1), 1);
});

test("uses a changed higher-fat ratio without code changes", () => {
  const changed = structuredClone(higherFatProteinLimitBaseline);
  changed.parameters.higher_fat_ratio.value = 0.4;

  assert.equal(maxHigherFatProteinDoses(changed, 8), 4);
  assert.equal(maxHigherFatProteinDoses(changed, 7), 3);
  assert.equal(maxHigherFatProteinDoses(changed, 9), 4);
});

test("keeps rounding behavior in configuration", () => {
  const floorConfigured = structuredClone(higherFatProteinLimitBaseline);
  floorConfigured.outputs.max_higher_fat_protein_doses.expression.op = "floor";

  assert.equal(maxHigherFatProteinDoses(floorConfigured, 7), 3);
});

test("rejects negative or non-finite total protein doses", () => {
  assert.throws(
    () => maxHigherFatProteinDoses(higherFatProteinLimitBaseline, -1),
    RangeError,
  );
  assert.throws(
    () => maxHigherFatProteinDoses(higherFatProteinLimitBaseline, Number.NaN),
    RangeError,
  );
  assert.throws(
    () =>
      maxHigherFatProteinDoses(
        higherFatProteinLimitBaseline,
        Number.POSITIVE_INFINITY,
      ),
    RangeError,
  );
});

test("fails closed when the higher-fat protein output is absent", () => {
  assert.throws(
    () =>
      maxHigherFatProteinDoses(
        {
          inputs: {
            total_protein_doses: { unit: "dose" },
          },
          parameters: {},
          outputs: {},
        },
        8,
      ),
    TypeError,
  );
});
