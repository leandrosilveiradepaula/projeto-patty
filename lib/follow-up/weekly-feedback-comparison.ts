import { orderClientWeeklyFeedbacks } from "@/lib/follow-up/client-weekly-feedback-order";

export type SubmittedWeeklyFeedbackReference = {
  id: string;
  client_id: string;
  period_start: string;
  created_at: string;
  submitted_at: string | null;
};

/**
 * A "previous" record means an earlier reference period, not a previously
 * received email or an arbitrary older submission instant. This navigation
 * is factual: it does not infer adherence, progress or a professional action.
 */
export function previousSubmittedFeedbackByPeriod<T extends SubmittedWeeklyFeedbackReference>(
  records: readonly T[],
  currentId: string,
): T | null {
  const submitted = orderClientWeeklyFeedbacks(
    records.filter((record) => record.submitted_at !== null),
  );
  const index = submitted.findIndex((record) => record.id === currentId);
  if (index < 0) return null;

  const current = submitted[index];
  return submitted.slice(index + 1).find(
    (record) => record.client_id === current.client_id &&
      record.period_start < current.period_start,
  ) ?? null;
}

export type ComparedWeeklyFeedbackReference = Pick<
  SubmittedWeeklyFeedbackReference,
  "id" | "client_id" | "period_start" | "submitted_at"
>;

/**
 * Authorization must already have been applied by the authenticated RLS
 * query. This extra boundary refuses incomplete, cross-client, draft or
 * reversed pairs, including IDs supplied by someone modifying the URL.
 */
export function selectAuthorizedSubmittedFeedbackPair<T extends ComparedWeeklyFeedbackReference>(
  records: readonly T[],
  clientId: string,
  currentId: string,
  previousId: string,
): { current: T; previous: T } | null {
  if (currentId === previousId) return null;
  const current = records.find((record) => record.id === currentId);
  const previous = records.find((record) => record.id === previousId);

  if (!current || !previous ||
      current.client_id !== clientId || previous.client_id !== clientId ||
      !current.submitted_at || !previous.submitted_at ||
      !current.period_start || !previous.period_start ||
      previous.period_start >= current.period_start) return null;

  return { current, previous };
}

export function weeklyFeedbackComparisonHref(
  clientId: string,
  currentId: string,
  previousId: string,
): string {
  const params = new URLSearchParams({ atual: currentId, anterior: previousId });
  return `/admin/clientes/${encodeURIComponent(clientId)}/feedback-semanal/comparar?${params.toString()}`;
}
