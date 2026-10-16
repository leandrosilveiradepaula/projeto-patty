import "server-only";

import { collectScopedClientOperationalRows } from "@/lib/operations/client-operational-pagination";
import { createClient } from "@/lib/supabase/server";
import { RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE } from "@/lib/follow-up/received-weekly-feedback-inbox";
import type { VisiblePendingFeedback } from "@/lib/follow-up/pending-weekly-feedback-reminders";

/**
 * Only event headers for visible pending records in current authorized page.
 * Supabase admin MFA, RLS and active assignment remain authoritative.
 * Never fetch health answers, contact details or draft data.
 */
export async function listReminderEventsForVisiblePendingFeedbacks(
  feedbacks: readonly VisiblePendingFeedback[],
) {
  const pending = feedbacks.filter((feedback) => feedback.submitted_at === null);
  if (pending.length === 0) return [];
  if (pending.length > RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE) {
    throw new Error("Reminder inbox reader accepts only one visible page");
  }
  const clientIds = [...new Set(pending.map((feedback) => feedback.client_id))];
  const feedbackIds = [...new Set(pending.map((feedback) => feedback.id))];
  const supabase = await createClient();
  return collectScopedClientOperationalRows(clientIds, (ids, from, to) =>
    supabase.from("client_notification_events")
      .select("id, client_id, weekly_feedback_id, event_key, channel_key, delivery_state, created_at")
      .in("client_id", ids)
      .in("weekly_feedback_id", feedbackIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
}
