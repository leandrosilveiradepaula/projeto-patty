import { orderAdministrativeAssessments } from "./administrative-assessment-history.ts";

export type AssessmentPhotoComparisonAssessment = {
  id: string;
  client_id: string;
  assessed_at: string;
  finalized_at: string | null;
};

export type AssessmentPhotoComparisonFile = {
  id: string;
  file_kind: string;
  mime_type: string | null;
  original_filename: string | null;
  created_at: string;
};

export function earlierFinalizedPhotoAssessmentOptions<
  T extends AssessmentPhotoComparisonAssessment,
>(current: AssessmentPhotoComparisonAssessment, history: readonly T[]): T[] {
  const currentAt = Date.parse(current.assessed_at);
  if (!Number.isFinite(currentAt)) return [];
  return orderAdministrativeAssessments(history.filter((assessment) => {
    const previousAt = Date.parse(assessment.assessed_at);
    return assessment.id !== current.id &&
      assessment.client_id === current.client_id &&
      Boolean(assessment.finalized_at) &&
      Number.isFinite(previousAt) &&
      previousAt < currentAt;
  }));
}

export function selectEarlierPhotoAssessment<T extends AssessmentPhotoComparisonAssessment>(
  eligible: readonly T[],
  requested: unknown,
): { assessment: T | null; invalid: boolean } {
  if (requested === undefined) {
    return { assessment: eligible[0] ?? null, invalid: false };
  }
  if (typeof requested !== "string") return { assessment: null, invalid: true };
  const selected = eligible.find((assessment) => assessment.id === requested);
  return { assessment: selected ?? null, invalid: !selected };
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function eligibleAssessmentComparisonPhotos<T extends AssessmentPhotoComparisonFile>(
  files: readonly T[],
): T[] {
  return files
    .filter((file) => file.file_kind === "photo" && IMAGE_TYPES.has(file.mime_type ?? ""))
    .sort((left, right) => {
      const a = Date.parse(left.created_at);
      const b = Date.parse(right.created_at);
      const first = Number.isFinite(a) ? a : -Infinity;
      const second = Number.isFinite(b) ? b : -Infinity;
      if (first === -Infinity || second === -Infinity) {
        return first === -Infinity
          ? second === -Infinity ? left.id.localeCompare(right.id) : 1
          : -1;
      }
      return second - first || left.id.localeCompare(right.id);
    });
}

export type AssessmentPhotoPair<T extends AssessmentPhotoComparisonFile> =
  | { state: "unavailable" }
  | { state: "invalid" }
  | { state: "ready"; earlier: T; current: T };

/**
 * Parameters are never used to fetch arbitrary files. Only the previously
 * authorized assessment-file lists are eligible for rendering.
 */
export function selectAssessmentPhotoPair<T extends AssessmentPhotoComparisonFile>(
  earlierPhotos: readonly T[],
  currentPhotos: readonly T[],
  requestedEarlierId: unknown,
  requestedCurrentId: unknown,
): AssessmentPhotoPair<T> {
  if (earlierPhotos.length === 0 || currentPhotos.length === 0) {
    return { state: "unavailable" };
  }

  const hasSelection = requestedEarlierId !== undefined || requestedCurrentId !== undefined;
  if (hasSelection && (
    typeof requestedEarlierId !== "string" ||
    typeof requestedCurrentId !== "string"
  )) return { state: "invalid" };

  const earlier = hasSelection
    ? earlierPhotos.find((photo) => photo.id === requestedEarlierId)
    : earlierPhotos[0];
  const current = hasSelection
    ? currentPhotos.find((photo) => photo.id === requestedCurrentId)
    : currentPhotos.find((photo) => photo.id !== earlier?.id);

  if (!earlier || !current || earlier.id === current.id) return { state: "invalid" };
  return { state: "ready", earlier, current };
}
