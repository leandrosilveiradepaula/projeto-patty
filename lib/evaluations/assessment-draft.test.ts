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
  assert.equal(assessmentKindLabel("fortnightly"), "Básica");
  assert.equal(assessmentKindLabel(null), "Legada / não classificada");
});

test("assessment date is normalized without inferring time from the client timezone", () => {
  assert.equal(
    parseAssessmentDate("2026-09-27"),
    "2026-09-27T12:00:00.000Z",
  );
  assert.equal(parseAssessmentDate("27/09/2026"), null);
  assert.equal(parseAssessmentDate("2026-02-31"), null);
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
        key: "cintura",
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


test("unknown measurement keys remain freeform while confirmed cadence keys are canonicalized", () => {
  assert.deepEqual(
    parseMeasurementDraft({
      key: " WAIST ",
      unit: "cm",
      value: "70",
    }),
    {
      data: {
        key: "cintura",
        unit: "cm",
        value: 70,
      },
    },
  );

  assert.deepEqual(
    parseMeasurementDraft({
      key: " Braço direito ",
      unit: "cm",
      value: "31",
    }),
    {
      data: {
        key: "Braço direito",
        unit: "cm",
        value: 31,
      },
    },
  );
});

test("assessment date rejects year zero", () => {
  assert.equal(parseAssessmentDate("0000-01-01"), null);
});

test("measurement draft rejects file-valued fields", () => {
  for (const field of ["key", "unit", "value"] as const) {
    const input = { key: "peso", unit: "kg", value: "70" } as Record<string, FormDataEntryValue>;
    input[field] = new Blob(["invalid"]) as unknown as File;
    assert.ok("error" in parseMeasurementDraft(input));
  }
});

test("measurement draft rejects control characters in keys and units", () => {
  assert.ok("error" in parseMeasurementDraft({ key: "peso\u0000", unit: "kg", value: "70" }));
  assert.ok("error" in parseMeasurementDraft({ key: "peso", unit: "kg\u007f", value: "70" }));
});

test("measurement draft rejects oversized numeric strings", () => {
  assert.ok("error" in parseMeasurementDraft({ key: "peso", unit: "kg", value: "1".repeat(101) }));
});

test("measurement draft retains ordinary decimal input", () => {
  assert.deepEqual(parseMeasurementDraft({ key: "peso", unit: "kg", value: "70,5" }), {
    data: { key: "peso", unit: "kg", value: 70.5 },
  });
});
