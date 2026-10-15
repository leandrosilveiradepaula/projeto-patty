import { latestReminderEventByFeedback, type FeedbackReminderEventOrder } from "../operations/feedback-reminder-order.ts";

export type VisiblePendingFeedback = { id: string; client_id: string; submitted_at: string | null };
export type PendingFeedbackReminderEvent = FeedbackReminderEventOrder & {
  client_id: string;
  channel_key: string | null;
  delivery_state: string;
};

/** Navigation-scoped read model, never a clinical finding or evidence of message reading. */
export function latestVisiblePendingReminderEvents<E extends PendingFeedbackReminderEvent>(
  visiblePending: readonly VisiblePendingFeedback[],
  events: readonly E[],
): Map<string, E> {
  const allowed = new Map(
    visiblePending.filter((row) => row.submitted_at === null)
      .map((row) => [row.id, row.client_id]),
  );
  return latestReminderEventByFeedback(events.filter((event) =>
    allowed.get(event.weekly_feedback_id) === event.client_id
  ));
}
