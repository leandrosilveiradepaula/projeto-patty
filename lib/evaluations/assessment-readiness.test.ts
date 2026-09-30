import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssessmentFinalizationReadiness,
  canonicalizeKnownAssessmentMeasurementKey,
  normalizeAssessmentMeasurementKey,
} from "./assessment-readiness.ts";

test("known assessment aliases normalize without closing the open catalog", () => {
  assert.equal(normalizeAssessmentMeasurementKey("Cintura"), "cintura");
  assert.equal(normalizeAssessmentMeasurementKey("WAIST"), "cintura");
  assert.equal(normalizeAssessmentMeasurementKey("Abdômen"), "abdomen");
  assert.equal(normalizeAssessmentMeasurementKey("hip"), "quadril");
  assert.equal(
    canonicalizeKnownAssessmentMeasurementKey("Braço direito"),
    "Braço direito",
  );
});

test("fortnightly finalization requires the four confirmed measurements", () => {
  const readiness = buildAssessmentFinalizationReadiness({
    assessmentKind: "fortnightly",
    measurementKeys: ["Peso", "waist", "abdômen", "quadril"],
    photoCount: 0,
  });

  assert.equal(readiness.canFinalizeDeterministically, true);
  assert.equal(readiness.requiresMonthlyManualConfirmation, false);
  assert.deepEqual(
    readiness.items.map((item) => [item.key, item.present]),
    [
      ["peso", true],
      ["cintura", true],
      ["abdomen", true],
      ["quadril", true],
    ],
  );
});

test("monthly finalization requires weight and at least one photo, while full measure catalog stays human-reviewed", () => {
  const missingPhoto = buildAssessmentFinalizationReadiness({
    assessmentKind: "monthly",
    measurementKeys: ["peso", "cintura"],
    photoCount: 0,
  });

  assert.equal(missingPhoto.canFinalizeDeterministically, false);
  assert.equal(missingPhoto.requiresMonthlyManualConfirmation, true);

  const ready = buildAssessmentFinalizationReadiness({
    assessmentKind: "monthly",
    measurementKeys: ["weight"],
    photoCount: 1,
  });

  assert.equal(ready.canFinalizeDeterministically, true);
  assert.equal(ready.requiresMonthlyManualConfirmation, true);
});
