import assert from "node:assert/strict";
import test from "node:test";

import {
  clientInAppFeedbackNotices,
  formatInAppFeedbackPeriodDate,
  formatInAppNoticeTime,
} from "./client-in-app-inbox.ts";

const clientId = "client-own";
const ownFeedback = {
  id: "feedback-own", client_id: clientId,
  period_start: "2026-09-28", period_end: "2026-10-04", submitted_at: null,
};
const delivered = {
  id: "notice-1", client_id: clientId, weekly_feedback_id: ownFeedback.id,
  event_key: "weekly_feedback_reminder:feedback-own", channel_key: "in_app",
  delivery_state: "delivered", delivered_at: "2026-10-07T11:00:00Z",
  created_at: "2026-10-07T10:30:00Z",
};

test("only explicitly delivered in-app reminder events tied to own feedback appear", () => {
  const events = [
    delivered,
    { ...delivered, id: "email", channel_key: "email" },
    { ...delivered, id: "queued", delivery_state: "queued_external" },
    { ...delivered, id: "blocked", delivery_state: "blocked" },
    { ...delivered, id: "unknown", event_key: "other_kind" },
    { ...delivered, id: "different-client", client_id: "other" },
    { ...delivered, id: "nonexistent", weekly_feedback_id: "not-visible" },
    { ...delivered, id: "no-access", weekly_feedback_id: "feedback-other" },
  ];
  const rows = clientInAppFeedbackNotices(events, [
    ownFeedback,
    { ...ownFeedback, id: "feedback-other", client_id: "other" },
  ], clientId);
  assert.deepEqual(rows.map(row => row.event.id), ["notice-1"]);
  assert.equal(rows[0].status, "pending");
  assert.equal(rows[0].recordedAt, delivered.delivered_at);
});

test("submitting changes only the derived status, never the saved reminder event", () => {
  const submitted = { ...ownFeedback, submitted_at: "2026-10-09T10:00:00Z" };
  const result = clientInAppFeedbackNotices([delivered], [submitted], clientId);
  assert.equal(result[0].status, "responded");
  assert.equal(delivered.delivery_state, "delivered");
  assert.equal(ownFeedback.submitted_at, null);
});

test("instants sort by real time across offsets, with historical invalids last", () => {
  const a = { ...delivered, id: "a", delivered_at: "2026-10-07T12:00:00+02:00" };
  const b = { ...delivered, id: "b", delivered_at: "2026-10-07T09:30:00-03:00" };
  const c = { ...delivered, id: "c", delivered_at: null, created_at: "invalid" };
  const input = [a, c, b];
  const result = clientInAppFeedbackNotices(input, [ownFeedback], clientId);
  assert.deepEqual(result.map(row => row.event.id), ["b", "a", "c"]);
  assert.deepEqual(input.map(row => row.id), ["a", "c", "b"]);
});

test("missing delivery timestamp uses recorded timestamp and malformed periods remain neutral", () => {
  const event = { ...delivered, delivered_at: null };
  assert.equal(clientInAppFeedbackNotices([event], [ownFeedback], clientId)[0].recordedAt, event.created_at);
  assert.equal(formatInAppFeedbackPeriodDate("2026-02-30"), "Data indisponível");
  assert.equal(formatInAppFeedbackPeriodDate("not-a-date"), "Data indisponível");
  assert.match(formatInAppFeedbackPeriodDate("2026-10-04"), /04\/10\/2026/);
  assert.equal(formatInAppNoticeTime("bad"), "Data indisponível");
});

test("no notices are invented from unanswered feedback without an in-app delivery", () => {
  assert.deepEqual(clientInAppFeedbackNotices([], [ownFeedback], clientId), []);
  assert.deepEqual(clientInAppFeedbackNotices([delivered], [], clientId), []);
});
