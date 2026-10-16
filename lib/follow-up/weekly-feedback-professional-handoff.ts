import { isUuid } from "../validation/uuid.ts";
import { readWeeklyFeedbackAnswerView, weeklyFeedbackAnswerViewHref, type WeeklyFeedbackAnswerView } from "./weekly-feedback-factual-differences.ts";
import { weeklyFeedbackComparisonHref } from "./weekly-feedback-comparison.ts";

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
  view: WeeklyFeedbackAnswerView = "todas",
): string {
  const params = new URLSearchParams({
    feedbackAtual: currentId,
    feedbackAnterior: previousId,
  });
  // Carry presentation state only, never health answers or a decision.
  if (view === "diferentes") params.set("feedbackVisao", "diferentes");
  return `/admin/avaliacoes/${encodeURIComponent(assessmentId)}?${params.toString()}#acompanhamento`;
}

/** The assessment is a separate authorized page. Return links can contain
 * only validated opaque record IDs and a known presentation mode. The
 * destination comparison independently checks assignment, AAL2 and both
 * submitted records again; this function grants no access.
 */
export function weeklyFeedbackComparisonReturnHref(
  clientId: string,
  pair: WeeklyComparisonReturn,
  rawView: unknown,
): string {
  const view = readWeeklyFeedbackAnswerView(rawView);
  return !view.invalid && view.view === "diferentes"
    ? weeklyFeedbackAnswerViewHref(clientId, pair.currentId, pair.previousId, "diferentes")
    : weeklyFeedbackComparisonHref(clientId, pair.currentId, pair.previousId);
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

/** Context is navigation only; destination pages and writes recheck RLS. */
export function withSubmittedWeeklyFeedbackAssessmentContext(
  href: string,
  feedbackId: string | null,
): string {
  if (!feedbackId || !isUuid(feedbackId) || !href.startsWith("/admin/") || href.startsWith("//")) return href;
  const hashIndex = href.indexOf("#");
  const pathWithQuery = hashIndex < 0 ? href : href.slice(0, hashIndex);
  const hash = hashIndex < 0 ? "" : href.slice(hashIndex);
  const queryIndex = pathWithQuery.indexOf("?");
  const pathname = queryIndex < 0 ? pathWithQuery : pathWithQuery.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex < 0 ? "" : pathWithQuery.slice(queryIndex + 1));
  params.set("feedbackAtual", feedbackId);
  return pathname + "?" + params.toString() + hash;
}

export function assessmentDirectoryFromSubmittedFeedbackHref(clientId: string, feedbackId: string): string {
  if (!isUuid(clientId) || !isUuid(feedbackId)) return "/admin/feedback-semanal";
  return withSubmittedWeeklyFeedbackAssessmentContext(
    "/admin/clientes/" + encodeURIComponent(clientId) + "/avaliacoes#nova-avaliacao", feedbackId,
  );
}
