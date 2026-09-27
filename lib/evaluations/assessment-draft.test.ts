import assert from "node:assert/strict";
import test from "node:test";

import {
  assessmentKindLabel,
  isAssessmentKind,
  parseAssessmentDate,
  parseMeasurementDraft,
} from "./assessment-draft.ts";

test("assessment kind accepts only the two confirmed cadences", () => {
  assert.equal(isAssessmentKind("fortnightly"), true);
  assert.equal(isAssessmentKind("monthly"), true);
  assert.equal(isAssessmentKind("weekly"), false);
  assert.equal(assessmentKindLabel("fortnightly"), "Quinzenal");
  assert.equal(assessmentKindLabel(null), "Legada / não classificada");
});

test("assessment date is normalized without inferring time from the client timezone", () => {
  assert.equal(
    parseAssessmentDate("2026-09-27"),
    "2026-09-27T12:00:00.000Z",
  );
  assert.equal(parseAssessmentDate("27/09/2026"), null);
});

test("measurement draft preserves freeform key and unit while validating numeric value", () => {
  assert.deepEqual(
    parseMeasurementDraft({
      key: " Cintura ",
      unit: " cm ",
      value: "74,5",
    }),
    {
      data: {
        key: "Cintura",
        unit: "cm",
        value: 74.5,
      },
    },
  );

  assert.equal(
    "error" in
      parseMeasurementDraft({
        key: "",
        unit: "cm",
        value: "10",
      }),
    true,
  );
});
