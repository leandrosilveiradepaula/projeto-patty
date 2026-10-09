import assert from "node:assert/strict";
import test from "node:test";
import { parseScalarParameterShapeConfiguration } from "./scalar-parameter.ts";

test("scalar configuration rejects malformed and oversized units", () => {
  for (const unit of [" kg", "kg ", "x".repeat(81), ""]) {
    assert.throws(() => parseScalarParameterShapeConfiguration({ value: 12, unit }), TypeError);
  }
});

test("scalar configuration keeps valid custom units configurable", () => {
  assert.deepEqual(parseScalarParameterShapeConfiguration({ value: 1.5, unit: "g_per_kg" }), {
    value: 1.5, unit: "g_per_kg",
  });
});
