/**
 * Records a factual ordering: a client requested training after the last
 * human publication. This does not imply an automatic prescription or phase.
 */
export function isTrainingRequestAfterPublication(
  requestedAt: string,
  publishedAt: string | null | undefined,
): boolean {
  if (!publishedAt) return false;
  const requested = Date.parse(requestedAt);
  const published = Date.parse(publishedAt);
  return Number.isFinite(requested) && Number.isFinite(published) && requested > published;
}
