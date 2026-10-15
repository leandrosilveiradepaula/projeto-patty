/** Last-mile guard against sending a stale weekly-feedback reminder.
 * Database claims remain authoritative for candidate selection; this pure
 * check narrows the race when feedback/contact/channel/assignment changed.
 * No answers, credentials, or identifiers are exposed in its result.
 */
export type WeeklyFeedbackEmailClaim = {
  client_id: string;
  weekly_feedback_id: string;
  notification_event_id: string;
  recipient_email: string;
  period_start: string;
  period_end: string;
};

export type WeeklyFeedbackEmailEligibilitySnapshot = {
  feedback: {
    client_id: string;
    submitted_at: string | null;
    period_start: string;
    period_end: string;
  } | null;
  notification: {
    client_id: string;
    weekly_feedback_id: string;
    channel_key: string | null;
    preference_version_id: string | null;
    delivery_state: string;
  } | null;
  preference: {
    id: string;
    client_id: string;
    purpose_key: string;
    channel_key: string;
    retired_at: string | null;
  } | null;
  contact: {
    client_id: string;
    contact_email: string | null;
  } | null;
  activeAssignment: { client_id: string } | null;
};

export type ReminderEligibilityIssue =
  | "feedback_not_pending"
  | "notification_changed"
  | "channel_changed"
  | "contact_changed"
  | "assignment_ended";

/** null means eligible at the instant the fresh rows were read, not a lock. */
export function checkWeeklyFeedbackEmailEligibility(
  claim: WeeklyFeedbackEmailClaim,
  state: WeeklyFeedbackEmailEligibilitySnapshot,
): ReminderEligibilityIssue | null {
  if (!state.feedback ||
      state.feedback.client_id !== claim.client_id ||
      state.feedback.submitted_at !== null ||
      state.feedback.period_start !== claim.period_start ||
      state.feedback.period_end !== claim.period_end) {
    return "feedback_not_pending";
  }

  if (!state.notification ||
      state.notification.client_id !== claim.client_id ||
      state.notification.weekly_feedback_id !== claim.weekly_feedback_id ||
      state.notification.channel_key !== "email" ||
      !["queued_external", "blocked_provider"].includes(state.notification.delivery_state)) {
    return "notification_changed";
  }

  if (!state.preference ||
      state.preference.client_id !== claim.client_id ||
      state.preference.purpose_key !== "weekly_feedback" ||
      state.preference.channel_key !== "email" ||
      state.preference.retired_at !== null ||
      state.notification.preference_version_id !== state.preference.id) {
    return "channel_changed";
  }

  if (!state.contact ||
      state.contact.client_id !== claim.client_id ||
      !state.contact.contact_email?.trim() ||
      state.contact.contact_email.trim() !== claim.recipient_email.trim()) {
    return "contact_changed";
  }

  if (!state.activeAssignment ||
      state.activeAssignment.client_id !== claim.client_id) {
    return "assignment_ended";
  }

  return null;
}
