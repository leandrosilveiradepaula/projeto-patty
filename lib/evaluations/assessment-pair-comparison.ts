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
