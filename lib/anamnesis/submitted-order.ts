export type SubmittedAnamnesisOrdering = {
  id: string;
  submitted_at: string | null;
};

/**
 * The current professional draft aid must use the most recently submitted
 * anamnesis, rather than the most recently created draft. Submission is the
 * observable handoff from the client; creation may have happened much earlier.
 */
export function latestSubmittedAnamnesis<T extends SubmittedAnamnesisOrdering>(
  submissions: readonly T[],
): T | null {
  return submissions
    .filter((submission): submission is T & { submitted_at: string } =>
      typeof submission.submitted_at === "string" && submission.submitted_at.length > 0,
    )
    .sort((left, right) => {
      const leftAt = Date.parse(left.submitted_at);
      const rightAt = Date.parse(right.submitted_at);
      const a = Number.isFinite(leftAt) ? leftAt : -Infinity;
      const b = Number.isFinite(rightAt) ? rightAt : -Infinity;
      return b - a || left.id.localeCompare(right.id);
    })[0] ?? null;
}
