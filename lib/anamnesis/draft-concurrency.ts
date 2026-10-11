/**
 * Expected persisted answer supplied by the draft editor. Absence and an
 * intentionally blank saved value are different states.
 *
 * This is a concurrency guard, not an authorization decision. The database
 * remains responsible for ownership, versioning and submitted immutability.
 */
export type DraftAnswerExpectation =
  | { exists: false }
  | { exists: true; value: string };

export function parseDraftAnswerExpectation(formData: FormData): DraftAnswerExpectation | null {
  const exists = formData.get("expectedAnswerExists");
  const value = formData.get("expectedAnswerValue");

  if (exists === "0" && value === "") return { exists: false };
  if (exists === "1" && typeof value === "string") return { exists: true, value };
  return null;
}

export function matchesDraftAnswerExpectation(
  actual: { answer_value: unknown } | null,
  expected: DraftAnswerExpectation,
): boolean {
  if (!expected.exists) return actual === null;
  return actual !== null && actual.answer_value === expected.value;
}

/** Encode a scalar answer for an equality filter against a JSONB column. */
export function draftAnswerJsonbFilter(value: string) {
  return JSON.stringify(value);
}
