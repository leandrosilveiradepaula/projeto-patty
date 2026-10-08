/**
 * Liquid entries represent a whole number of millilitres.
 * Do not truncate decimal or exponent-like strings with parseInt.
 */
export function parsePositiveCheckinMl(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  // PostgreSQL stores amount_ml and corrected_amount_ml as signed int4.
  // This is a persistence boundary, not a hydration recommendation.
  const POSTGRES_INT4_MAX = 2_147_483_647;
  return Number.isSafeInteger(amount) && amount > 0 && amount <= POSTGRES_INT4_MAX ? amount : null;
}
