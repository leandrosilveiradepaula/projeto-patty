import assert from "node:assert/strict";
import test from "node:test";
import { formatDoseTotal, sumVariantDoses } from "./variant-dose-totals.ts";

test("sums fractional meal doses per macro with four-decimal precision", () => {
  assert.deepEqual(sumVariantDoses([
    { doseType: "protein", doseQuantity: 1.5 },
    { doseType: "carbohydrate", doseQuantity: 0.1 },
    { doseType: "protein", doseQuantity: 0.25 },
    { doseType: "fat", doseQuantity: 0.3333 },
    { doseType: "carbohydrate", doseQuantity: 0.2 },
  ]), { protein: 1.75, carbohydrate: 0.3, fat: 0.3333 });
});

test("missing macro remains zero; does not infer targets", () => {
  assert.deepEqual(sumVariantDoses([]), { protein: 0, carbohydrate: 0, fat: 0 });
  assert.deepEqual(sumVariantDoses([{ doseType: "fat", doseQuantity: 2 }]), {
    protein: 0, carbohydrate: 0, fat: 2,
  });
});

test("unknown, negative, non-finite or invalid precision fails closed", () => {
  for (const dose of [
    { doseType: "fiber", doseQuantity: 1 },
    { doseType: "protein", doseQuantity: -1 },
    { doseType: "protein", doseQuantity: Number.NaN },
    { doseType: "protein", doseQuantity: Number.POSITIVE_INFINITY },
    { doseType: "fat", doseQuantity: 0.00001 },
    { doseType: "fat", doseQuantity: Number.MAX_SAFE_INTEGER },
  ]) assert.equal(sumVariantDoses([dose]), null);
});

test("displays Brazilian fractional doses without rounding them to integers", () => {
  assert.equal(formatDoseTotal(1), "1 dose");
  assert.equal(formatDoseTotal(0), "0 doses");
  assert.equal(formatDoseTotal(0.3333), "0,3333 doses");
});
