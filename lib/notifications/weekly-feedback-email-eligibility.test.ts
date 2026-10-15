import assert from "node:assert/strict";
import test from "node:test";

import {
  checkWeeklyFeedbackEmailEligibility,
  type WeeklyFeedbackEmailClaim,
  type WeeklyFeedbackEmailEligibilitySnapshot,
} from "./weekly-feedback-email-eligibility.ts";

const claim: WeeklyFeedbackEmailClaim = {
  client_id: "client-a",
  weekly_feedback_id: "feedback-a",
  notification_event_id: "notice-a",
  recipient_email: "client@example.invalid",
  period_start: "2026-10-05",
  period_end: "2026-10-11",
};

function snapshot(): WeeklyFeedbackEmailEligibilitySnapshot {
  return {
    feedback: {
      client_id: claim.client_id,
      submitted_at: null,
      period_start: claim.period_start,
      period_end: claim.period_end,
    },
    notification: {
      client_id: claim.client_id,
      weekly_feedback_id: claim.weekly_feedback_id,
      channel_key: "email",
      preference_version_id: "preference-a",
      delivery_state: "queued_external",
    },
    preference: {
      id: "preference-a",
      client_id: claim.client_id,
      purpose_key: "weekly_feedback",
      channel_key: "email",
      retired_at: null,
    },
    contact: {
      client_id: claim.client_id,
      contact_email: claim.recipient_email,
    },
    activeAssignment: { client_id: claim.client_id },
  };
}

test("only unchanged and still-pending feedback permits the claimed reminder", () => {
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, snapshot()), null);
  const state = snapshot();
  state.notification!.delivery_state = "blocked_provider";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, state), null);
});

test("client submission or changed period cancels claimed reminder", () => {
  const submitted = snapshot();
  submitted.feedback!.submitted_at = "2026-10-15T16:00:00Z";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, submitted), "feedback_not_pending");
  const changed = snapshot();
  changed.feedback!.period_end = "2026-10-12";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, changed), "feedback_not_pending");
  const missing = snapshot();
  missing.feedback = null;
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, missing), "feedback_not_pending");
});

test("retired or changed notification preference prevents outdated email", () => {
  const channel = snapshot();
  channel.preference!.channel_key = "in_app";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, channel), "channel_changed");
  const updated = snapshot();
  updated.notification!.preference_version_id = "new-version";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, updated), "channel_changed");
  const retired = snapshot();
  retired.preference!.retired_at = "2026-10-15T16:00:00Z";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, retired), "channel_changed");
});

test("changed or missing contact and stopped assignment prevent delivery", () => {
  const changed = snapshot();
  changed.contact!.contact_email = "new@example.invalid";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, changed), "contact_changed");
  const absent = snapshot();
  absent.contact = null;
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, absent), "contact_changed");
  const ended = snapshot();
  ended.activeAssignment = null;
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, ended), "assignment_ended");
});

test("cross-client or invalid source notices fail closed", () => {
  const cross = snapshot();
  cross.notification!.client_id = "client-b";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, cross), "notification_changed");
  const delivered = snapshot();
  delivered.notification!.delivery_state = "delivered";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, delivered), "notification_changed");
  const wrongFeedback = snapshot();
  wrongFeedback.notification!.weekly_feedback_id = "another-feedback";
  assert.equal(checkWeeklyFeedbackEmailEligibility(claim, wrongFeedback), "notification_changed");
});
