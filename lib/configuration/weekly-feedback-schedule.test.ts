import assert from "node:assert/strict";
import test from "node:test";

import {
  parseWeeklyFeedbackScheduleConfiguration,
  serializeWeeklyFeedbackScheduleConfiguration,
} from "./weekly-feedback-schedule.ts";

test("parses the confirmed weekly feedback baseline", () => {
  assert.deepEqual(
    parseWeeklyFeedbackScheduleConfiguration({
      request_weekday: 1,
      request_time_local: "08:00",
      reminder_weekday: 3,
      timezone: "America/Sao_Paulo",
    }),
    {
      requestWeekday: 1,
      requestTimeLocal: "08:00",
      reminderWeekday: 3,
      timezone: "America/Sao_Paulo",
    },
  );
});

test("serializes a validated schedule back to persistence shape", () => {
  assert.deepEqual(
    serializeWeeklyFeedbackScheduleConfiguration({
      requestWeekday: 2,
      requestTimeLocal: "09:30",
      reminderWeekday: 4,
      timezone: "America/Sao_Paulo",
    }),
    {
      request_weekday: 2,
      request_time_local: "09:30",
      reminder_weekday: 4,
      timezone: "America/Sao_Paulo",
    },
  );
});

test("rejects invalid weekdays, times, missing fields and extra fields", () => {
  assert.throws(
    () =>
      parseWeeklyFeedbackScheduleConfiguration({
        request_weekday: 0,
        request_time_local: "08:00",
        reminder_weekday: 3,
        timezone: "America/Sao_Paulo",
      }),
    RangeError,
  );

  assert.throws(
    () =>
      parseWeeklyFeedbackScheduleConfiguration({
        request_weekday: 1,
        request_time_local: "8:00",
        reminder_weekday: 3,
        timezone: "America/Sao_Paulo",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseWeeklyFeedbackScheduleConfiguration({
        request_weekday: 1,
        request_time_local: "08:00",
        timezone: "America/Sao_Paulo",
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseWeeklyFeedbackScheduleConfiguration({
        request_weekday: 1,
        request_time_local: "08:00",
        reminder_weekday: 3,
        timezone: "America/Sao_Paulo",
        channel: "email",
      }),
    TypeError,
  );
});

test("rejects invalid or unsupported IANA time zones", () => {
  const baseline = { request_weekday: 1, request_time_local: "08:00", reminder_weekday: 3 };
  for (const timezone of ["Invalid/Timezone", " ", "x".repeat(101)]) {
    assert.throws(() => parseWeeklyFeedbackScheduleConfiguration({ ...baseline, timezone }));
  }
});

test("rejects malformed weekday types", () => {
  const baseline = { request_weekday: 1, request_time_local: "08:00", reminder_weekday: 3, timezone: "America/Sao_Paulo" };
  for (const request_weekday of ["1", 1.5, null, Number.POSITIVE_INFINITY]) {
    assert.throws(() => parseWeeklyFeedbackScheduleConfiguration({ ...baseline, request_weekday }));
  }
});

test("accepts configurable valid time zones beyond the default", () => {
  assert.equal(parseWeeklyFeedbackScheduleConfiguration({
    request_weekday: 5, request_time_local: "16:30", reminder_weekday: 7, timezone: "Europe/Lisbon",
  }).timezone, "Europe/Lisbon");
});
