import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssessmentFinalizationReadiness,
  canonicalizeKnownAssessmentMeasurementKey,
  normalizeAssessmentMeasurementKey,
} from "./assessment-readiness.ts";

test("known assessment aliases normalize to the confirmed catalog", () => {
  assert.equal(normalizeAssessmentMeasurementKey("Cintura"), "cintura");
  assert.equal(normalizeAssessmentMeasurementKey("WAIST"), "cintura");
  assert.equal(normalizeAssessmentMeasurementKey("Abdômen"), "abdomen");
  assert.equal(normalizeAssessmentMeasurementKey("hip"), "quadril");
  assert.equal(normalizeAssessmentMeasurementKey("Busto"), "torax");
  assert.equal(normalizeAssessmentMeasurementKey("Peito"), "torax");
  assert.equal(normalizeAssessmentMeasurementKey("Coxa"), "coxa");
  assert.equal(normalizeAssessmentMeasurementKey("Panturrilha"), "panturrilhas");
  assert.equal(
    canonicalizeKnownAssessmentMeasurementKey("Braço direito"),
    "Braço direito",
  );
});

test("basic finalization requires weight waist abdomen and hip", () => {
  const readiness = buildAssessmentFinalizationReadiness({
    assessmentKind: "fortnightly",
    measurementKeys: ["Peso", "waist", "abdômen", "quadril"],
    photoCount: 0,
  });

  assert.equal(readiness.canFinalizeDeterministically, true);
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

test("complete finalization requires the confirmed complete catalog and a photo", () => {
  const readiness = buildAssessmentFinalizationReadiness({
    assessmentKind: "monthly",
    measurementKeys: [
      "weight",
      "cintura",
      "abdomen",
      "coxa",
      "biceps",
      "busto",
      "quadril",
      "ombros",
      "panturrilha",
    ],
    photoCount: 1,
  });

  assert.equal(readiness.canFinalizeDeterministically, true);
  assert.equal(
    readiness.items.find((item) => item.key === "torax")?.present,
    true,
  );
  assert.equal(
    readiness.items.find((item) => item.key === "foto")?.present,
    true,
  );
});

test("complete finalization fails closed when a confirmed item is missing", () => {
  const readiness = buildAssessmentFinalizationReadiness({
    assessmentKind: "monthly",
    measurementKeys: [
      "peso",
      "cintura",
      "abdomen",
      "coxa",
      "biceps",
      "peito",
      "quadril",
      "ombros",
    ],
    photoCount: 1,
  });

  assert.equal(readiness.canFinalizeDeterministically, false);
  assert.equal(
    readiness.items.find((item) => item.key === "panturrilhas")?.present,
    false,
  );
});
