import "server-only";

import { collectScopedClientOperationalRows } from "@/lib/operations/client-operational-pagination";
import { createClient } from "@/lib/supabase/server";
import {
  receivedWeeklyFeedbackMonthBounds,
  type ReceivedWeeklyFeedbackFilters,
} from "@/lib/follow-up/received-weekly-feedback-inbox";

/**
 * Reads only non-sensitive receipt headers from currently assigned clients.
 * The same authenticated RLS/MFA boundary as the individual feedback history
 * remains authoritative. No health answers or service role are needed.
 */
export async function listReceivedWeeklyFeedbackHeadersForClients(
  clientIds: readonly string[],
  filters: Pick<ReceivedWeeklyFeedbackFilters, "origin" | "month">,
) {
  const supabase = await createClient();
  const monthBounds = filters.month === "all"
    ? null : receivedWeeklyFeedbackMonthBounds(filters.month);
  return collectScopedClientOperationalRows(clientIds, (ids, from, to) => {
    const query = supabase
      .from("client_weekly_feedbacks")
      .select("id, client_id, period_start, period_end, request_source, submitted_at")
      .in("client_id", ids)
      .not("submitted_at", "is", null);

    if (filters.origin !== "all") query.eq("request_source", filters.origin);
    if (monthBounds) {
      query.gte("period_start", monthBounds.first);
      query.lte("period_start", monthBounds.last);
    }

    return query
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
  });
}
