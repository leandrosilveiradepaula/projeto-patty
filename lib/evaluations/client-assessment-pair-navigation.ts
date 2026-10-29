import { selectFinalizedAssessmentPair, type AuthorizedAssessmentPair } from "./assessment-pair-comparison.ts";

/**
 * The caller must supply IDs from the client's current, authorized finalized
 * history. Search parameters never authorize an assessment by themselves.
 */
export function clientAssessmentPairHref(
  raw: { referencia?: unknown; comparacao?: unknown },
  authorizedFinalizedIds: readonly string[],
): string | null {
  const pair = selectFinalizedAssessmentPair(raw, authorizedFinalizedIds);
  if (!pair) return null;

  const search = new URLSearchParams({
    referencia: pair.referenceId,
    comparacao: pair.comparisonId,
  });
  return "/cliente/avaliacoes/comparar?" + search.toString() + "#comparacao-resultados";
}

/** A link to the exact assessment from the already-authorized pair only. */
export function clientAssessmentFromPairHref(
  assessmentId: string,
  pair: AuthorizedAssessmentPair,
  authorizedFinalizedIds: readonly string[],
): string | null {
  const selected = selectFinalizedAssessmentPair({
    referencia: pair.referenceId,
    comparacao: pair.comparisonId,
  }, authorizedFinalizedIds);
  if (!selected ||
      (assessmentId !== selected.referenceId &&
       assessmentId !== selected.comparisonId)) return null;

  return "/cliente/avaliacoes?avaliacao=" + encodeURIComponent(assessmentId) +
    "#avaliacao-" + assessmentId;
}
