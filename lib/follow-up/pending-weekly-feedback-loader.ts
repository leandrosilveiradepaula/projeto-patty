import "server-only";

import { collectScopedClientOperationalRows } from "@/lib/operations/client-operational-pagination";
import { createClient } from "@/lib/supabase/server";
import {
  receivedWeeklyFeedbackMonthBounds,
  type ReceivedWeeklyFeedbackFilters,
} from "@/lib/follow-up/received-weekly-feedback-inbox";

/**
 * Read only pending request headers for active assignments.
 * Never query answers or drafts; the caller's RLS/MFA remains authoritative.
 */
export async function listPendingWeeklyFeedbackHeadersForClients(
  clientIds: readonly string[],
  filters: Pick<ReceivedWeeklyFeedbackFilters, "origin" | "month">,
) {
  const supabase = await createClient();
  const monthBounds = filters.month === "all"
    ? null : receivedWeeklyFeedbackMonthBounds(filters.month);

  return collectScopedClientOperationalRows(clientIds, (ids, from, to) => {
    const query = supabase
      .from("client_weekly_feedbacks")
      .select("id, client_id, period_start, period_end, request_source, submitted_at, created_at, due_at")
      .in("client_id", ids)
      .is("submitted_at", null);

    if (filters.origin !== "all") query.eq("request_source", filters.origin);
    if (monthBounds) {
      query.gte("period_start", monthBounds.first);
      query.lte("period_start", monthBounds.last);
    }

    return query
      .order("period_start", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
  });
}
