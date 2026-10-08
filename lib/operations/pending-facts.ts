import "server-only";

import { createClient } from "@/lib/supabase/server";
import { collectScopedPendingRows } from "@/lib/operations/pending-pagination";

// The queue reads only fields needed to determine the next operational action.
// These are authenticated SELECTs under the existing RLS; no service role is used.

export async function listPendingAnamnesisSubmissionsForClients(clientIds: string[]) {
  const supabase = await createClient();
  return collectScopedPendingRows(clientIds, (batch, from, to) =>
    supabase.from("anamnesis_submissions")
      .select("id, client_id, created_at, submitted_at")
      .in("client_id", batch)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

export async function listPendingWeeklyFeedbacksForClients(clientIds: string[]) {
  const supabase = await createClient();
  return collectScopedPendingRows(clientIds, (batch, from, to) =>
    supabase.from("client_weekly_feedbacks")
      .select("id, client_id, period_start, period_end, due_at, submitted_at, created_at")
      .in("client_id", batch)
      .order("period_start", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

export async function listPendingNotificationEventsForClients(clientIds: string[]) {
  const supabase = await createClient();
  return collectScopedPendingRows(clientIds, (batch, from, to) =>
    supabase.from("client_notification_events")
      .select("id, client_id, weekly_feedback_id, event_key, channel_key, delivery_state, blocked_reason, created_at")
      .in("client_id", batch)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

export async function listPendingAnamnesisReviewsForSubmissions(submissionIds: string[]) {
  const supabase = await createClient();
  return collectScopedPendingRows(submissionIds, (batch, from, to) =>
    supabase.from("anamnesis_reviews")
      .select("id, submission_id")
      .in("submission_id", batch)
      .order("submission_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

export async function listPendingClarificationRequestsForSubmissions(submissionIds: string[]) {
  const supabase = await createClient();
  return collectScopedPendingRows(submissionIds, (batch, from, to) =>
    supabase.from("anamnesis_clarification_requests")
      .select("id, submission_id, created_at")
      .in("submission_id", batch)
      .order("submission_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

export async function listPendingProtocolVersionsForProtocols(protocolIds: string[]) {
  const supabase = await createClient();
  return collectScopedPendingRows(protocolIds, (batch, from, to) =>
    supabase.from("protocol_versions")
      .select("id, protocol_id, client_id, version_number, submitted_for_review_at, created_at")
      .in("protocol_id", batch)
      .order("protocol_id", { ascending: true })
      .order("version_number", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
  );
}
