/**
 * Liquid entries represent a whole number of millilitres.
 * Do not truncate decimal or exponent-like strings with parseInt.
 */
export function parsePositiveCheckinMl(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
