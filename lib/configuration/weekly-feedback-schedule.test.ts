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
