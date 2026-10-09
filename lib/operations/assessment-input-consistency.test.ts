import assert from "node:assert/strict";
import test from "node:test";

import { parseAssessmentMeasurementNumber, parseMeasurementDraft } from "../evaluations/assessment-draft.ts";

test("measurement parser accepts ordinary decimal values and decimal commas", () => {
  assert.equal(parseAssessmentMeasurementNumber(" 12,5 "), 12.5);
  assert.equal(parseAssessmentMeasurementNumber("-0.25"), -0.25);
  assert.equal(parseAssessmentMeasurementNumber(".5"), 0.5);
  assert.equal(parseAssessmentMeasurementNumber("0"), 0);
});

test("measurement parser rejects blank values and non-decimal formats", () => {
  for (const input of ["", " ", "0x10", "1e3", "Infinity", "1,2,3", "12abc"]) {
    assert.equal(parseAssessmentMeasurementNumber(input), null, input);
  }
});

test("measurement draft rejects malformed values through shared parser", () => {
  const result = parseMeasurementDraft({ key: "weight", unit: "kg", value: "1e3" });
  assert.ok("error" in result);
});
