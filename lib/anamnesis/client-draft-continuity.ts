/**
 * Navigation-only ordering for Anamnesis drafts already visible through RLS.
 * This does not infer a professional priority or change a submission's state.
 */
export type ClientAnamnesisDraftFact = {
  id: string;
  created_at: string;
  submitted_at: string | null;
};

function createdAtInstant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function orderClientAnamnesisDrafts<T extends ClientAnamnesisDraftFact>(
  submissions: readonly T[],
): T[] {
  return submissions
    .filter((submission) => submission.submitted_at === null)
    .sort((left, right) => {
      const leftInstant = createdAtInstant(left.created_at);
      const rightInstant = createdAtInstant(right.created_at);

      if (
        leftInstant !== null &&
        rightInstant !== null &&
        leftInstant !== rightInstant
      ) {
        return rightInstant - leftInstant;
      }

      if (leftInstant !== null && rightInstant === null) return -1;
      if (leftInstant === null && rightInstant !== null) return 1;
      return right.id.localeCompare(left.id);
    });
}

export function currentClientAnamnesisDraft<T extends ClientAnamnesisDraftFact>(
  submissions: readonly T[],
): T | null {
  return orderClientAnamnesisDrafts(submissions)[0] ?? null;
}
