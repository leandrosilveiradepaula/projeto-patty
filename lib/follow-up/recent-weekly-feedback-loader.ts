import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  latestSubmittedWeeklyFeedbacks,
  WEEKLY_FEEDBACK_RECEIPT_CLIENT_BATCH_SIZE,
  WEEKLY_FEEDBACK_RECEIPT_PREVIEW_LIMIT,
  type WeeklyFeedbackReceiptHeader,
} from "@/lib/follow-up/recent-weekly-feedbacks";

/**
 * A bounded, client-scoped inbox preview for the current professional.
 * Only identifiers, periods and timestamps are read; never answers.
 * Every request uses the signed-in Supabase client and existing RLS/MFA.
 */
export async function listRecentSubmittedWeeklyFeedbacksForClients(clientIds: readonly string[]) {
  const uniqueIds = [...new Set(clientIds)];
  if (uniqueIds.length === 0) return [];

  const supabase = await createClient();
  const candidates: WeeklyFeedbackReceiptHeader[] = [];

  // Each batch contributes its latest five records. Their union contains
  // the global latest five, without fetching the complete feedback history.
  for (let start = 0; start < uniqueIds.length; start += WEEKLY_FEEDBACK_RECEIPT_CLIENT_BATCH_SIZE) {
    const batch = uniqueIds.slice(start, start + WEEKLY_FEEDBACK_RECEIPT_CLIENT_BATCH_SIZE);
    const { data, error } = await supabase
      .from("client_weekly_feedbacks")
      .select("id, client_id, period_start, period_end, submitted_at")
      .in("client_id", batch)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(WEEKLY_FEEDBACK_RECEIPT_PREVIEW_LIMIT);

    if (error) throw error;
    if (data === null) throw new Error("Não foi possível carregar os recebimentos do Feedback Semanal.");
    candidates.push(...data);
  }

  return latestSubmittedWeeklyFeedbacks(candidates, uniqueIds);
}
