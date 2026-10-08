/**
 * Parse user-entered doses without coercing scientific/hex input or silently
 * rounding beyond the existing numeric(12,4) database scale.
 *
 * 999 is the editor's existing input safety ceiling, not a clinical limit.
 * Doses remain manually selected by Patty; fractional amounts are supported.
 */
export function parseProtocolDraftDoseQuantity(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;

  const input = value.trim();
  if (!/^(?:\d+(?:[.,]\d{1,4})?|[.,]\d{1,4})$/.test(input)) {
    return null;
  }

  const amount = Number(input.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999) {
    return null;
  }

  return amount;
}
