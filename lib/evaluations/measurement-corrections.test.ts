import assert from "node:assert/strict";
import test from "node:test";

import { applyAssessmentMeasurementCorrections } from "./measurement-corrections.ts";

test("latest correction becomes effective without overwriting original", () => {
  const [measurement] = applyAssessmentMeasurementCorrections(
    [
      {
        assessment_id: "assessment-1",
        id: "measurement-1",
        measurement_key: "cintura",
        measurement_value: 80,
        unit: "cm",
      },
    ],
    [
      {
        assessment_measurement_id: "measurement-1",
        corrected_measurement_value: 79.5,
        corrected_unit: "cm",
        created_at: "2026-09-30T10:00:00Z",
        id: "correction-1",
      },
      {
        assessment_measurement_id: "measurement-1",
        corrected_measurement_value: 79,
        corrected_unit: "cm",
        created_at: "2026-09-30T11:00:00Z",
        id: "correction-2",
      },
    ],
  );

  assert.equal(measurement.measurement_value, 79);
  assert.equal(measurement.original_measurement_value, 80);
  assert.equal(measurement.correction_count, 2);
  assert.equal(measurement.latest_correction_id, "correction-2");
});

test("measurement remains unchanged when there is no correction", () => {
  const [measurement] = applyAssessmentMeasurementCorrections(
    [
      {
        assessment_id: "assessment-1",
        id: "measurement-1",
        measurement_key: "peso",
        measurement_value: 70,
        unit: "kg",
      },
    ],
    [],
  );

  assert.equal(measurement.measurement_value, 70);
  assert.equal(measurement.original_measurement_value, 70);
  assert.equal(measurement.correction_count, 0);
  assert.equal(measurement.latest_correction_id, null);
});

test("orphaned corrections do not affect effective measurement history", () => {
  const result = applyAssessmentMeasurementCorrections(
    [{ assessment_id: "a", id: "m", measurement_key: "peso", measurement_value: 70, unit: "kg" }],
    [{ assessment_measurement_id: "unknown", corrected_measurement_value: 99, corrected_unit: "kg", created_at: "2026-01-01T00:00:00Z", id: "c" }],
  );
  assert.equal(result[0]?.correction_count, 0);
  assert.equal(result[0]?.measurement_value, 70);
});

test("nonfinite correction values do not replace original measurements", () => {
  const result = applyAssessmentMeasurementCorrections(
    [{ assessment_id: "a", id: "m", measurement_key: "peso", measurement_value: 70, unit: "kg" }],
    [{ assessment_measurement_id: "m", corrected_measurement_value: Number.NaN, corrected_unit: "kg", created_at: "2026-01-01T00:00:00Z", id: "c" }],
  );
  assert.equal(result[0]?.measurement_value, 70);
  assert.equal(result[0]?.correction_count, 0);
});

test("corrections with blank units are ignored", () => {
  const result = applyAssessmentMeasurementCorrections(
    [{ assessment_id: "a", id: "m", measurement_key: "peso", measurement_value: 70, unit: "kg" }],
    [{ assessment_measurement_id: "m", corrected_measurement_value: 69, corrected_unit: " ", created_at: "2026-01-01T00:00:00Z", id: "c" }],
  );
  assert.equal(result[0]?.measurement_value, 70);
});

test("corrections with invalid dates are ignored", () => {
  const result = applyAssessmentMeasurementCorrections(
    [{ assessment_id: "a", id: "m", measurement_key: "peso", measurement_value: 70, unit: "kg" }],
    [{ assessment_measurement_id: "m", corrected_measurement_value: 69, corrected_unit: "kg", created_at: "not-a-date", id: "c" }],
  );
  assert.equal(result[0]?.measurement_value, 70);
});

test("valid corrections remain effective when malformed later corrections exist", () => {
  const result = applyAssessmentMeasurementCorrections(
    [{ assessment_id: "a", id: "m", measurement_key: "peso", measurement_value: 70, unit: "kg" }],
    [
      { assessment_measurement_id: "m", corrected_measurement_value: 69, corrected_unit: "kg", created_at: "2026-01-01T00:00:00Z", id: "c1" },
      { assessment_measurement_id: "m", corrected_measurement_value: Number.POSITIVE_INFINITY, corrected_unit: "kg", created_at: "2026-02-01T00:00:00Z", id: "c2" },
    ],
  );
  assert.equal(result[0]?.measurement_value, 69);
  assert.equal(result[0]?.latest_correction_id, "c1");
});
