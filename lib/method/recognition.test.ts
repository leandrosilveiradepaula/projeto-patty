import assert from "node:assert/strict";
import test from "node:test";

import { recognitionMetabolicReferenceMacros } from "./recognition.ts";

test("uses the confirmed general Recognition Metabolic macro reference", () => {
  assert.deepEqual(recognitionMetabolicReferenceMacros(70), {
    proteinGrams: 140,
    carbohydrateGrams: 140,
    fatGrams: 50,
  });

  assert.deepEqual(recognitionMetabolicReferenceMacros(82.5), {
    proteinGrams: 165,
    carbohydrateGrams: 165,
    fatGrams: 50,
  });
});

test("does not round the weight-based reference", () => {
  assert.deepEqual(recognitionMetabolicReferenceMacros(63.25), {
    proteinGrams: 126.5,
    carbohydrateGrams: 126.5,
    fatGrams: 50,
  });
});

test("rejects negative or non-finite weight", () => {
  assert.throws(() => recognitionMetabolicReferenceMacros(-1), RangeError);
  assert.throws(
    () => recognitionMetabolicReferenceMacros(Number.NaN),
    RangeError,
  );
  assert.throws(
    () => recognitionMetabolicReferenceMacros(Number.POSITIVE_INFINITY),
    RangeError,
  );
});
