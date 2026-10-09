export type FeedbackReminderEventOrder = {
  id: string;
  weekly_feedback_id: string;
  event_key: string;
  created_at: string;
};

/**
 * The most recent persisted reminder event is the current delivery status.
 * Accept only reminder/delivery events; event ordering must not rely on a
 * paginated query's incidental return order. This does not claim inbox receipt.
 */
export function latestReminderEventByFeedback<T extends FeedbackReminderEventOrder>(
  events: readonly T[],
): Map<string, T> {
  const relevant = events.filter((event) =>
    event.event_key.startsWith("weekly_feedback_reminder:") ||
    event.event_key.startsWith("weekly_feedback_email_delivery:") ||
    event.event_key.startsWith("weekly_feedback_email_delivery_failed:"),
  );
  relevant.sort((a, b) => {
    const left = Date.parse(a.created_at);
    const right = Date.parse(b.created_at);
    const leftValue = Number.isFinite(left) ? left : -Infinity;
    const rightValue = Number.isFinite(right) ? right : -Infinity;
    return rightValue - leftValue || b.id.localeCompare(a.id);
  });

  const byFeedback = new Map<string, T>();
  for (const event of relevant) {
    if (event.weekly_feedback_id && !byFeedback.has(event.weekly_feedback_id)) {
      byFeedback.set(event.weekly_feedback_id, event);
    }
  }
  return byFeedback;
}
