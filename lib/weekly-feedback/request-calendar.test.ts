import assert from "node:assert/strict";
import test from "node:test";
import { isValidWeeklyFeedbackCalendarDay, parseOptionalWeeklyFeedbackDueAt } from "./request-calendar.ts";

test("manual periods accept valid civil days, including leap days", () => {
  for (const day of ["2026-10-08", "2028-02-29", "2026-12-31"]) {
    assert.equal(isValidWeeklyFeedbackCalendarDay(day), true, day);
  }
});
test("manual periods reject impossible dates, even when formatted as dates", () => {
  for (const day of ["2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "2026-10-00", "2026-10-1", "2026-10-08T08:00", {}, null]) {
    assert.equal(isValidWeeklyFeedbackCalendarDay(day), false, String(day));
  }
});
test("manual deadline is optional and valid local time converts to an exact instant", () => {
  assert.deepEqual(parseOptionalWeeklyFeedbackDueAt(null), {ok:true,dueAt:null});
  assert.deepEqual(parseOptionalWeeklyFeedbackDueAt(""), {ok:true,dueAt:null});
  assert.deepEqual(parseOptionalWeeklyFeedbackDueAt("2026-10-08T08:00"), {ok:true,dueAt:"2026-10-08T11:00:00.000Z"});
  assert.deepEqual(parseOptionalWeeklyFeedbackDueAt("2028-02-29T23:59"), {ok:true,dueAt:"2028-03-01T02:59:00.000Z"});
});
test("malformed deadline never reaches new Date or is silently treated as optional", () => {
  for (const value of ["2026-02-30T08:00", "2026-13-01T09:00", "2026-10-08T24:00", "2026-10-08T12:60", "2026-10-08T08:00Z", "2026-10-08T08:00:00", "invalid", " ", {name:"upload"}]) {
    assert.deepEqual(parseOptionalWeeklyFeedbackDueAt(value), {ok:false}, String(value));
  }
});
