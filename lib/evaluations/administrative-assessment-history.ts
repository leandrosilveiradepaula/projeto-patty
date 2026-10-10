import { newestFactualAssessments } from "./progress-journey.ts";

export type HistoricalAdministrativeAssessment = {
  id: string;
  assessed_at: string;
};

/**
 * Administrative lists and factual comparisons share a stable chronological
 * order. An invalid legacy date goes last. This does not establish clinical
 * precedence or automatically change a protocol.
 */
export function orderAdministrativeAssessments<T extends HistoricalAdministrativeAssessment>(
  rows: readonly T[],
): T[] {
  return newestFactualAssessments(
    rows.map((original) => ({
      id: original.id,
      assessedAt: original.assessed_at,
      original,
    })),
  ).map((item) => item.original);
}

export function findPreviousFinalizedAssessment<
  T extends HistoricalAdministrativeAssessment & { finalized_at: string | null },
>(current: HistoricalAdministrativeAssessment, rows: readonly T[]): T | null {
  const currentInstant = Date.parse(current.assessed_at);
  if (!Number.isFinite(currentInstant)) return null;

  const older = rows.filter((assessment) => {
    const at = Date.parse(assessment.assessed_at);
    return (
      assessment.id !== current.id &&
      Boolean(assessment.finalized_at) &&
      Number.isFinite(at) &&
      at < currentInstant
    );
  });

  return orderAdministrativeAssessments(older)[0] ?? null;
}

export function formatAdministrativeAssessmentDate(value: string): string {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
