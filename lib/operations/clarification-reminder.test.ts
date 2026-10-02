import assert from "node:assert/strict";
import test from "node:test";

import {
  clarificationReminderDueAt,
  clarificationReminderIntervalHours,
  isClarificationReminderDue,
} from "./clarification-reminder.ts";

const currentBaseline = {
  value: 24,
  unit: "hour",
};

test("reproduces the confirmed 24-hour reminder baseline", () => {
  assert.equal(clarificationReminderIntervalHours(currentBaseline), 24);
  assert.equal(
    clarificationReminderDueAt(
      currentBaseline,
      "2026-09-23T10:00:00Z",
    ),
    "2026-09-24T10:00:00.000Z",
  );
  assert.equal(
    isClarificationReminderDue(
      currentBaseline,
      "2026-09-23T10:00:00Z",
      "2026-09-24T10:00:00Z",
    ),
    true,
  );
  assert.equal(
    isClarificationReminderDue(
      currentBaseline,
      "2026-09-23T10:00:00Z",
      "2026-09-24T09:59:59Z",
    ),
    false,
  );
});

test("uses a changed interval without changing runtime code", () => {
  const changed = {
    value: 12,
    unit: "hour",
  };

  assert.equal(
    clarificationReminderDueAt(
      changed,
      "2026-09-23T10:00:00Z",
    ),
    "2026-09-23T22:00:00.000Z",
  );
});

test("rejects invalid units, non-positive values, and invalid timestamps", () => {
  assert.throws(
    () => clarificationReminderIntervalHours({ value: 24, unit: "day" }),
    TypeError,
  );
  assert.throws(
    () => clarificationReminderIntervalHours({ value: 0, unit: "hour" }),
    RangeError,
  );
  assert.throws(
    () => clarificationReminderDueAt(currentBaseline, "not-a-date"),
    TypeError,
  );
  assert.throws(
    () =>
      isClarificationReminderDue(
        currentBaseline,
        "2026-09-23T10:00:00Z",
        "not-a-date",
      ),
    TypeError,
  );
});
