import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFESSIONAL_DECISION_OPTIONS,
  isProfessionalDecision,
} from "./professional-decisions.ts";

test("confirmed professional decisions remain the documented closed set", () => {
  assert.deepEqual(
    PROFESSIONAL_DECISION_OPTIONS.map((option) => option.value),
    ["maintain", "simplify", "advance", "return"],
  );
});

test("accepts every confirmed professional decision", () => {
  for (const option of PROFESSIONAL_DECISION_OPTIONS) {
    assert.equal(isProfessionalDecision(option.value), true);
  }
});

test("rejects unknown, empty and case-shifted decisions", () => {
  for (const value of ["", "pause", "MAINTAIN", "advance-now"]) {
    assert.equal(isProfessionalDecision(value), false);
  }
});
