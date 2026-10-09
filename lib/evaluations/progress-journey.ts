import type { FactualProgressSeries } from "./progress-view.ts";

type DatedAssessment = { id: string; assessedAt: string };

/**
 * Latest assessment first, using actual instants instead of ISO text.
 * Invalid legacy dates come last; IDs make ties deterministic. This sorts
 * factual records, never scores progress or changes clinical interpretation.
 */
export function newestFactualAssessments<T extends DatedAssessment>(
  assessments: readonly T[],
): T[] {
  return [...assessments].sort((left, right) => {
    const a = Date.parse(left.assessedAt);
    const b = Date.parse(right.assessedAt);
    const validA = Number.isFinite(a);
    const validB = Number.isFinite(b);
    if (validA && validB && a !== b) return b - a;
    if (validA !== validB) return validA ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
}

/** Distinguishes one factual measurement from comparable observations. */
export function summarizeFactualProgressCoverage(
  series: readonly FactualProgressSeries[],
): {
  seriesCount: number;
  comparableSeriesCount: number;
  singleObservationSeriesCount: number;
} {
  return {
    seriesCount: series.length,
    comparableSeriesCount: series.filter((item) => item.points.length >= 2).length,
    singleObservationSeriesCount: series.filter((item) => item.points.length === 1).length,
  };
}
