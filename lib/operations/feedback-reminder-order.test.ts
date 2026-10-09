import assert from "node:assert/strict";
import test from "node:test";
import { latestReminderEventByFeedback } from "./feedback-reminder-order.ts";

test("most recent reminder status wins despite input order and timezones", () => {
  const events = [
    { id: "1", weekly_feedback_id: "fb", event_key: "weekly_feedback_reminder:a", created_at: "2026-10-08T10:00:00Z", delivery_state: "queued_external" },
    { id: "x", weekly_feedback_id: "fb", event_key: "other_event", created_at: "2026-10-09T10:00:00Z", delivery_state: "blocked" },
    { id: "2", weekly_feedback_id: "fb", event_key: "weekly_feedback_email_delivery:b", created_at: "2026-10-08T09:30:00-03:00", delivery_state: "delivered" },
    { id: "3", weekly_feedback_id: "other", event_key: "weekly_feedback_reminder:c", created_at: "2026-10-07T10:00:00Z", delivery_state: "blocked" },
  ];
  const rows = latestReminderEventByFeedback(events);
  assert.equal(rows.get("fb")?.id, "2");
  assert.equal(rows.get("fb")?.delivery_state, "delivered");
  assert.equal(rows.get("other")?.id, "3");
  assert.equal(events[0].id, "1");
});

test("invalid timestamps lose to valid events; identical timestamps use deterministic id ordering", () => {
  const rows = latestReminderEventByFeedback([
    { id: "old", weekly_feedback_id: "a", event_key: "weekly_feedback_reminder:x", created_at: "invalid" },
    { id: "b", weekly_feedback_id: "a", event_key: "weekly_feedback_reminder:y", created_at: "2026-10-09T10:00:00Z" },
    { id: "a", weekly_feedback_id: "a", event_key: "weekly_feedback_reminder:z", created_at: "2026-10-09T10:00:00Z" },
  ]);
  assert.equal(rows.get("a")?.id, "b");
});
