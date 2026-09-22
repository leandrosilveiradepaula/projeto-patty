import assert from "node:assert/strict";
import test from "node:test";

import {
  DOSE_GRAMS,
  dosesToGrams,
  gramsPerDose,
  gramsToDoses,
  maxHigherFatProteinDoses,
} from "./doses.ts";

test("uses the confirmed grams per dose", () => {
  assert.equal(DOSE_GRAMS.protein, 15);
  assert.equal(DOSE_GRAMS.carbohydrate, 12);
  assert.equal(DOSE_GRAMS.fat, 6);

  assert.equal(gramsPerDose("protein"), 15);
  assert.equal(gramsPerDose("carbohydrate"), 12);
  assert.equal(gramsPerDose("fat"), 6);
});

test("converts doses to grams without rounding", () => {
  assert.equal(dosesToGrams("protein", 2), 30);
  assert.equal(dosesToGrams("carbohydrate", 2.5), 30);
  assert.equal(dosesToGrams("fat", 0.5), 3);
});

test("converts grams to fractional doses", () => {
  assert.equal(gramsToDoses("protein", 30), 2);
  assert.equal(gramsToDoses("carbohydrate", 6), 0.5);
  assert.equal(gramsToDoses("fat", 3), 0.5);
});

test("rejects negative or non-finite dose and gram values", () => {
  assert.throws(() => dosesToGrams("protein", -1), RangeError);
  assert.throws(() => dosesToGrams("fat", Number.NaN), RangeError);
  assert.throws(() => gramsToDoses("protein", -1), RangeError);
  assert.throws(() => gramsToDoses("fat", Number.POSITIVE_INFINITY), RangeError);
});

test("limits higher-fat protein group to half, rounded up", () => {
  assert.equal(maxHigherFatProteinDoses(8), 4);
  assert.equal(maxHigherFatProteinDoses(7), 4);
  assert.equal(maxHigherFatProteinDoses(9), 5);
  assert.equal(maxHigherFatProteinDoses(0), 0);
  assert.equal(maxHigherFatProteinDoses(1), 1);
});

test("rejects fractional or negative total protein doses", () => {
  assert.throws(() => maxHigherFatProteinDoses(7.5), RangeError);
  assert.throws(() => maxHigherFatProteinDoses(-1), RangeError);
});
