/**
 * educational_content_versions.display_order is a positive PostgreSQL int4.
 * This is a storage constraint, not a configurable professional ranking.
 */
export const MAX_CONTENT_DISPLAY_ORDER = 2_147_483_647;

export function parseContentDisplayOrder(raw: unknown): number | null {
  const normalized = typeof raw === "string" ? raw.trim() : "";
  const value = /^[1-9][0-9]*$/.test(normalized)
    ? Number(normalized)
    : Number.NaN;

  return Number.isSafeInteger(value) && value > 0 && value <= MAX_CONTENT_DISPLAY_ORDER
    ? value
    : null;
}
