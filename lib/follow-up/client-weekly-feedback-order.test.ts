import assert from "node:assert/strict";
import test from "node:test";
import { firstPendingClientWeeklyFeedback, orderClientWeeklyFeedbacks } from "./client-weekly-feedback-order.ts";

const item = (id: string, period_start: string, created_at: string, submitted_at: string | null = null) =>
  ({ id, period_start, created_at, submitted_at });

test("weekly feedback navigation selects latest pending period regardless of DB order", () => {
  const entries = [
    item("old", "2026-09-21", "2026-09-22T12:00:00Z"),
    item("new-submitted", "2026-10-05", "2026-10-06T12:00:00Z", "2026-10-07T09:00:00Z"),
    item("new-open", "2026-09-28", "2026-09-29T12:00:00Z"),
  ];
  assert.equal(firstPendingClientWeeklyFeedback(entries)?.id, "new-open");
  assert.deepEqual(orderClientWeeklyFeedbacks(entries).map(x => x.id), ["new-submitted", "new-open", "old"]);
  assert.equal(entries[0].id, "old");
});

test("feedback for same period resolves by factual instant across offsets", () => {
  const rows = [
    item("later", "2026-10-05", "2026-10-09T10:30:00-03:00"),
    item("earlier", "2026-10-05", "2026-10-09T13:00:00Z"),
  ];
  assert.deepEqual(orderClientWeeklyFeedbacks(rows).map(x=>x.id), ["later", "earlier"]);
});

test("empty or entirely submitted weeks do not invent a pending action", () => {
  assert.equal(firstPendingClientWeeklyFeedback([]), null);
  assert.equal(firstPendingClientWeeklyFeedback([item("done", "2026-10-05", "2026-10-07T12:00:00Z", "2026-10-08T12:00:00Z")]), null);
});

test("equal request instants tie-break deterministically, without mutating input", () => {
  const rows = [
    item("a", "2026-10-05", "2026-10-09T09:00:00-03:00"),
    item("b", "2026-10-05", "2026-10-09T12:00:00Z"),
  ];
  assert.deepEqual(orderClientWeeklyFeedbacks(rows).map(x=>x.id), ["b", "a"]);
  assert.equal(rows[0].id, "a");
});
