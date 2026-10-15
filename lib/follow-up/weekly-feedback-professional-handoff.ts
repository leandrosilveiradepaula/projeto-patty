import { isUuid } from "../validation/uuid.ts";

export type FinalizedAssessmentChoice = {
  id: string;
  client_id: string;
  assessed_at: string;
  finalized_at: string | null;
};

/**
 * No implicit selection: a professional must deliberately choose which
 * finalized assessment will own any manual decision. This does not link
 * the weekly feedback to the assessment or mark any feedback as reviewed.
 */
export function manualDecisionAssessmentChoices<T extends FinalizedAssessmentChoice>(
  rows: readonly T[],
  authorizedClientId: string,
): T[] {
  return rows
    .filter((row) =>
      row.client_id === authorizedClientId &&
      row.finalized_at !== null &&
      Number.isFinite(Date.parse(row.assessed_at)))
    .sort((a, b) =>
      Date.parse(b.assessed_at) - Date.parse(a.assessed_at) ||
      b.id.localeCompare(a.id));
}

export type WeeklyComparisonReturn = {
  currentId: string;
  previousId: string;
};

/** Route-local navigation context only; never an authorization decision. */
export function readWeeklyComparisonReturn(
  current: unknown,
  previous: unknown,
): WeeklyComparisonReturn | null {
  if (
    typeof current !== "string" ||
    typeof previous !== "string" ||
    !isUuid(current) ||
    !isUuid(previous) ||
    current === previous
  ) return null;

  return { currentId: current, previousId: previous };
}

export function manualAssessmentDecisionFromComparisonHref(
  assessmentId: string,
  currentId: string,
  previousId: string,
): string {
  const params = new URLSearchParams({
    feedbackAtual: currentId,
    feedbackAnterior: previousId,
  });
  return `/admin/avaliacoes/${encodeURIComponent(assessmentId)}?${params.toString()}#acompanhamento`;
}

/**
 * Explicit return destination for a professional decision, including the
 * FIRST submitted feedback (which has no previous period to compare).
 * Navigational IDs cannot grant data access or mark feedback as reviewed.
 */
export type WeeklyFeedbackDecisionReturn =
  | { kind: "submitted"; currentId: string }
  | ({ kind: "comparison" } & WeeklyComparisonReturn);

export function readWeeklyFeedbackDecisionReturn(
  current: unknown,
  previous: unknown,
): WeeklyFeedbackDecisionReturn | null {
  if (typeof current !== "string" || !isUuid(current)) return null;
  if (previous === undefined) return { kind: "submitted", currentId: current };
  const pair = readWeeklyComparisonReturn(current, previous);
  return pair ? { kind: "comparison", ...pair } : null;
}

export function manualAssessmentDecisionFromSubmittedFeedbackHref(
  assessmentId: string,
  submittedId: string,
): string {
  const params = new URLSearchParams({ feedbackAtual: submittedId });
  return "/admin/avaliacoes/" + encodeURIComponent(assessmentId) + "?" + params.toString() + "#acompanhamento";
}
