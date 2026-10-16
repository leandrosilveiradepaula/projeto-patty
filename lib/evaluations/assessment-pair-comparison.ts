import { isUuid } from "../validation/uuid.ts";
import type { FactualProgressSeries } from "./progress-view.ts";

export function selectFinalizedAssessmentPair(
  raw: { referencia?: unknown; comparacao?: unknown },
  allowedIds: readonly string[],
): { referenceId: string; comparisonId: string } | null {
  if (typeof raw.referencia !== "string" || typeof raw.comparacao !== "string" ||
      !isUuid(raw.referencia) || !isUuid(raw.comparacao) || raw.referencia === raw.comparacao) return null;
  const permitted = new Set(allowedIds);
  if (!permitted.has(raw.referencia) || !permitted.has(raw.comparacao)) return null;
  return { referenceId: raw.referencia, comparisonId: raw.comparacao };
}

export type AssessmentPairRow = {
  key: string;
  label: string;
  unit: string;
  reference: number | null;
  comparison: number | null;
  difference: number | null;
};

export function compareFinalizedAssessmentPair(
  series: readonly FactualProgressSeries[],
  referenceId: string,
  comparisonId: string,
): AssessmentPairRow[] {
  return series.flatMap(item => {
    const before = item.points.find(p => p.assessmentId === referenceId);
    const after = item.points.find(p => p.assessmentId === comparisonId);
    if (!before && !after) return [];
    const reference = before?.value ?? null;
    const comparison = after?.value ?? null;
    const delta = reference !== null && comparison !== null ? comparison - reference : null;
    return {
      key: item.key, label: item.label, unit: item.unit,
      reference, comparison,
      difference: delta !== null && Number.isFinite(delta) ? delta : null,
    };
  });
}

export type AuthorizedAssessmentPair = {
  referenceId: string;
  comparisonId: string;
};

/** Selection and origin URLs carry only opaque IDs. Authorization is checked
 * against the currently visible FINALIZED assessments at every destination. */
export function readAssessmentPairFromDetail(
  raw: { pareamentoReferencia?: unknown; pareamentoComparacao?: unknown },
  finalizedAssessmentIds: readonly string[],
  currentAssessmentId: string,
): AuthorizedAssessmentPair | null {
  const pair = selectFinalizedAssessmentPair({
    referencia: raw.pareamentoReferencia,
    comparacao: raw.pareamentoComparacao,
  }, finalizedAssessmentIds);
  if (!pair || (currentAssessmentId !== pair.referenceId &&
                currentAssessmentId !== pair.comparisonId)) return null;
  return pair;
}

export function selectedAssessmentPairHref(
  clientId: string,
  pair: AuthorizedAssessmentPair,
  photos?: { referencePhotoId?: unknown; comparisonPhotoId?: unknown },
): string {
  if (!isUuid(clientId) || !isUuid(pair.referenceId) ||
      !isUuid(pair.comparisonId) || pair.referenceId === pair.comparisonId) {
    return "/admin/clientes";
  }
  const search = new URLSearchParams({
    referencia: pair.referenceId,
    comparacao: pair.comparisonId,
  });
  // The IDs are non-sensitive opaque references. The destination always
  // revalidates both IDs against the currently authorized photo associations.
  if (typeof photos?.referencePhotoId === "string" && isUuid(photos.referencePhotoId) &&
      typeof photos?.comparisonPhotoId === "string" && isUuid(photos.comparisonPhotoId) &&
      photos.referencePhotoId !== photos.comparisonPhotoId) {
    search.set("fotoReferencia", photos.referencePhotoId);
    search.set("fotoComparacao", photos.comparisonPhotoId);
  }
  return "/admin/clientes/" + clientId + "/avaliacoes/comparar?" +
    search.toString() + "#comparacao-resultados";
}

/** Builds a detail deep link only from an already authorized comparison. */
export function assessmentFromSelectedPairHref(
  assessmentId: string,
  pair: AuthorizedAssessmentPair,
  photos?: { referencePhotoId?: unknown; comparisonPhotoId?: unknown },
): string {
  if (!isUuid(assessmentId)) return "/admin/avaliacoes";
  const base = "/admin/avaliacoes/" + assessmentId;
  if (!isUuid(pair.referenceId) || !isUuid(pair.comparisonId) ||
      pair.referenceId === pair.comparisonId ||
      (assessmentId !== pair.referenceId && assessmentId !== pair.comparisonId)) {
    return base;
  }
  const search = new URLSearchParams({
    pareamentoReferencia: pair.referenceId,
    pareamentoComparacao: pair.comparisonId,
  });
  if (typeof photos?.referencePhotoId === "string" && isUuid(photos.referencePhotoId) &&
      typeof photos?.comparisonPhotoId === "string" && isUuid(photos.comparisonPhotoId) &&
      photos.referencePhotoId !== photos.comparisonPhotoId) {
    search.set("pareamentoFotoReferencia", photos.referencePhotoId);
    search.set("pareamentoFotoComparacao", photos.comparisonPhotoId);
  }
  return base + "?" + search.toString();
}
