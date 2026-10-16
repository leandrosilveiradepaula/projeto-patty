/** Stable and per-request IDs for labels, validation, and keyboard focus.
 * One client can have several pending feedback periods using the same 21 keys.
 * The length segment makes the boundary between record ID and key unambiguous.
 * Only opaque record identifiers and question keys occur here; never answers.
 */
export function weeklyFeedbackAnswerFieldId(feedbackId: string, questionKey: string): string {
  return `weekly-feedback-answer-${feedbackId.length}-${encodeURIComponent(feedbackId)}-${encodeURIComponent(questionKey)}`;
}

/** Dedicated, per-feedback label target. Never collides with answer field IDs. */
export function weeklyFeedbackQuestionNavigationId(feedbackId: string): string {
  return "weekly-feedback-navigation-" + feedbackId.length + "-" + encodeURIComponent(feedbackId);
}
