import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSESSMENT_BASIC_PLACEMENT,
  formatIsoWeekdayPtBr,
  parseAssessmentSchedulePreferencesConfiguration,
  serializeAssessmentSchedulePreferencesConfiguration,
} from "./assessment-schedule-preferences.ts";

test("parses the confirmed assessment schedule preference baseline", () => {
  assert.deepEqual(
    parseAssessmentSchedulePreferencesConfiguration({
      basic_placement: ASSESSMENT_BASIC_PLACEMENT,
      complete_preferred_weekdays: [5, 6],
    }),
    {
      basicPlacement: ASSESSMENT_BASIC_PLACEMENT,
      completePreferredWeekdays: [5, 6],
    },
  );
});

test("sorts valid weekdays and serializes persistence shape", () => {
  assert.deepEqual(
    serializeAssessmentSchedulePreferencesConfiguration({
      basicPlacement: ASSESSMENT_BASIC_PLACEMENT,
      completePreferredWeekdays: [6, 5],
    }),
    {
      basic_placement: ASSESSMENT_BASIC_PLACEMENT,
      complete_preferred_weekdays: [5, 6],
    },
  );
});

test("rejects invalid shapes without inventing a calendar rule", () => {
  for (const invalid of [[], [5, 5], [0], [8]]) {
    assert.throws(() =>
      parseAssessmentSchedulePreferencesConfiguration({
        basic_placement: ASSESSMENT_BASIC_PLACEMENT,
        complete_preferred_weekdays: invalid,
      }),
    );
  }

  assert.throws(
    () =>
      parseAssessmentSchedulePreferencesConfiguration({
        basic_placement: ASSESSMENT_BASIC_PLACEMENT,
        complete_preferred_weekdays: [5, 6],
        automatic_date: true,
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseAssessmentSchedulePreferencesConfiguration({
        basic_placement: "every_14_days",
        complete_preferred_weekdays: [5, 6],
      }),
    RangeError,
  );
});

test("formats supported weekdays in pt-BR", () => {
  assert.equal(formatIsoWeekdayPtBr(5), "sexta-feira");
  assert.equal(formatIsoWeekdayPtBr(6), "sábado");
  assert.throws(() => formatIsoWeekdayPtBr(0), RangeError);
});
