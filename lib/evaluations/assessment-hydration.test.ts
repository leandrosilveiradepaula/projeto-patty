import assert from "node:assert/strict";
import test from "node:test";

import { resolveAssessmentWeightKg } from "./assessment-hydration.ts";

test("resolves current Portuguese weight key in kilograms", () => {
  assert.equal(
    resolveAssessmentWeightKg([
      { measurement_key: "peso", measurement_value: 62.4, unit: "kg" },
    ]),
    62.4,
  );
});

test("keeps historical weight alias compatible", () => {
  assert.equal(
    resolveAssessmentWeightKg([
      { measurement_key: "weight", measurement_value: 71, unit: "KG" },
    ]),
    71,
  );
});

test("does not infer unit conversion", () => {
  assert.equal(
    resolveAssessmentWeightKg([
      { measurement_key: "peso", measurement_value: 62000, unit: "g" },
    ]),
    null,
  );
});

test("ignores missing or invalid weight", () => {
  assert.equal(
    resolveAssessmentWeightKg([
      { measurement_key: "cintura", measurement_value: 80, unit: "cm" },
    ]),
    null,
  );

  assert.equal(
    resolveAssessmentWeightKg([
      { measurement_key: "peso", measurement_value: 0, unit: "kg" },
    ]),
    null,
  );
});
