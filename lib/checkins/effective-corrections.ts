/**
 * Corrections are append-only. An event can have several corrections and the
 * newest one is effective without removing or changing any earlier record.
 *
 * Do not rely on query order or use new Map(corrections.map(...)): with
 * descending rows that silently selects the oldest correction for each event.
 */
export function latestCheckinCorrectionsByEvent<
  T extends {
    created_at: string;
    event_id: string;
    id: string;
  },
>(corrections: readonly T[]): Map<string, T> {
  const latest = new Map<string, T>();

  for (const correction of corrections) {
    const previous = latest.get(correction.event_id);
    const candidateAt = Date.parse(correction.created_at);
    const previousAt = previous ? Date.parse(previous.created_at) : Number.NaN;
    const candidateValid = Number.isFinite(candidateAt);
    const previousValid = Number.isFinite(previousAt);

    if (
      !previous ||
      (candidateValid && !previousValid) ||
      (candidateValid && previousValid && candidateAt > previousAt) ||
      (
        candidateValid === previousValid &&
        (!candidateValid || candidateAt === previousAt) &&
        correction.id > previous.id
      )
    ) {
      latest.set(correction.event_id, correction);
    }
  }

  return latest;
}
