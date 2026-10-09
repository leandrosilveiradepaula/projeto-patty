import assert from "node:assert/strict";
import test from "node:test";

import { buildFactualProgressSeries } from "./progress-view.ts";

test("builds chronological factual series and numeric deltas", () => {
  const series = buildFactualProgressSeries([
    {
      assessedAt: "2026-10-01",
      id: "assessment-2",
      measurements: [
        { measurement_key: "weight", measurement_value: 70, unit: "kg" },
        { measurement_key: "waist", measurement_value: 80, unit: "cm" },
      ],
    },
    {
      assessedAt: "2026-09-01",
      id: "assessment-1",
      measurements: [
        { measurement_key: "weight", measurement_value: 72.5, unit: "kg" },
        { measurement_key: "waist", measurement_value: 83, unit: "cm" },
      ],
    },
  ]);

  const weight = series.find((item) => item.key === "weight" && item.unit === "kg");
  assert.ok(weight);
  assert.deepEqual(weight.points, [
    {
      assessedAt: "2026-09-01",
      assessmentId: "assessment-1",
      deltaFromPrevious: null,
      value: 72.5,
    },
    {
      assessedAt: "2026-10-01",
      assessmentId: "assessment-2",
      deltaFromPrevious: -2.5,
      value: 70,
    },
  ]);
});

test("keeps different units in separate factual series", () => {
  const series = buildFactualProgressSeries([
    {
      assessedAt: "2026-09-01",
      id: "assessment-1",
      measurements: [
        { measurement_key: "weight", measurement_value: 72, unit: "kg" },
      ],
    },
    {
      assessedAt: "2026-10-01",
      id: "assessment-2",
      measurements: [
        { measurement_key: "weight", measurement_value: 158.7, unit: "lb" },
      ],
    },
  ]);

  assert.equal(series.length, 2);
  assert.deepEqual(
    series.map((item) => item.unit).sort(),
    ["kg", "lb"],
  );
  assert.ok(series.every((item) => item.points[0]?.deltaFromPrevious === null));
});

test("ignores nonfinite progress values", () => {
  const series = buildFactualProgressSeries([
    { id: "a", assessedAt: "2026-01-01", measurements: [{ measurement_key: "weight", measurement_value: Number.NaN, unit: "kg" }] },
    { id: "b", assessedAt: "2026-02-01", measurements: [{ measurement_key: "weight", measurement_value: 70, unit: "kg" }] },
  ]);
  assert.deepEqual(series[0]?.points.map((point) => point.value), [70]);
  assert.equal(series[0]?.points[0]?.deltaFromPrevious, null);
});

test("does not duplicate the same measurement in one assessment", () => {
  const series = buildFactualProgressSeries([
    { id: "a", assessedAt: "2026-01-01", measurements: [
      { measurement_key: "weight", measurement_value: 70, unit: "kg" },
      { measurement_key: "weight", measurement_value: 71, unit: "kg" },
    ] },
  ]);
  assert.equal(series[0]?.points.length, 1);
});
