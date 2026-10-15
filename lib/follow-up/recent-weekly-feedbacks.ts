export type WeeklyFeedbackReceiptHeader = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  submitted_at: string | null;
};

export const WEEKLY_FEEDBACK_RECEIPT_PREVIEW_LIMIT = 5;
export const WEEKLY_FEEDBACK_RECEIPT_CLIENT_BATCH_SIZE = 100;

/** Latest actual submissions only; no invented unread/reviewed status. */
export function latestSubmittedWeeklyFeedbacks<T extends WeeklyFeedbackReceiptHeader>(
  rows: readonly T[],
  assignedClientIds: readonly string[],
  limit = WEEKLY_FEEDBACK_RECEIPT_PREVIEW_LIMIT,
): Array<T & { submitted_at: string }> {
  if (!Number.isSafeInteger(limit) || limit <= 0) return [];
  const permitted = new Set(assignedClientIds);
  return rows
    .filter((row): row is T & { submitted_at: string } =>
      permitted.has(row.client_id) &&
      typeof row.submitted_at === "string" &&
      Number.isFinite(Date.parse(row.submitted_at)))
    .sort((a, b) =>
      Date.parse(b.submitted_at) - Date.parse(a.submitted_at) ||
      b.id.localeCompare(a.id))
    .slice(0, limit);
}

/** The exact-record query is resolved again under the admin session's RLS. */
export function receivedWeeklyFeedbackExactHref(header: Pick<WeeklyFeedbackReceiptHeader, "id" | "client_id">) {
  const clientId = encodeURIComponent(header.client_id);
  const feedbackId = encodeURIComponent(header.id);
  return `/admin/clientes/${clientId}/feedback-semanal?registro=${feedbackId}#feedback-enviado-${feedbackId}`;
}
