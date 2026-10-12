import assert from "node:assert/strict";
import test from "node:test";
import { formatWeeklyFeedbackPeriodDate, formatWeeklyFeedbackDueDate } from "./date-format.ts";

test("weekly periods preserve Sao Paulo calendar days independent of process timezone", () => {
  assert.equal(formatWeeklyFeedbackPeriodDate("2026-10-12"), "12/10/2026");
  assert.equal(formatWeeklyFeedbackPeriodDate("2026-01-01"), "01/01/2026");
});

test("invalid and historically corrupt dates cannot crash weekly feedback", () => {
  for (const value of ["", "not-a-date", "2026-02-30", "2026-13-01", "2026-00-01", "2026-12-00", "2026-1-1", "0000-01-01"]) {
    assert.equal(formatWeeklyFeedbackPeriodDate(value), "Data indisponível");
  }
  assert.equal(formatWeeklyFeedbackDueDate(null), null);
  assert.equal(formatWeeklyFeedbackDueDate("bad-timestamp"), null);
  assert.equal(formatWeeklyFeedbackDueDate("2026-10-12T11:00:00Z"), "12/10/2026, 08:00");
});
