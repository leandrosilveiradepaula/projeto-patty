import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFactualMeasurementComparison,
  formatProfessionalMeasurementLabel,
} from "./professional-view.ts";

test("assessment comparison matches the same measurement key without interpretation", () => {
  const result = buildFactualMeasurementComparison(
    [
      { measurement_key: "cintura", measurement_value: 74, unit: "cm" },
      { measurement_key: "peso", measurement_value: 68.2, unit: "kg" },
    ],
    [
      { measurement_key: "cintura", measurement_value: 76, unit: "cm" },
      { measurement_key: "quadril", measurement_value: 99, unit: "cm" },
    ],
  );

  assert.deepEqual(result, [
    {
      currentValue: "74",
      label: "Cintura",
      previousValue: "76",
      unit: "cm",
    },
    {
      currentValue: "68.2",
      label: "Peso",
      previousValue: undefined,
      unit: "kg",
    },
  ]);
});

test("assessment labels improve known keys but preserve unknown catalog entries", () => {
  assert.equal(formatProfessionalMeasurementLabel("abdomen"), "Abdômen");
  assert.equal(formatProfessionalMeasurementLabel("chest"), "Peito");
  assert.equal(formatProfessionalMeasurementLabel("braco_direito"), "braco_direito");
});
