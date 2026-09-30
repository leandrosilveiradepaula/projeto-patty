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
