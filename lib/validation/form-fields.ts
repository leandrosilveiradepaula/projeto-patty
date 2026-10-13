/**
 * Sensitive mutations must not silently select the first of multiple values.
 * A malformed field, duplicated key or file upload is rejected identically.
 */
export function readSingleStringFormValue(formData: FormData, field: string): string | null {
  const entries = formData.getAll(field);
  return entries.length === 1 && typeof entries[0] === "string" ? entries[0] : null;
}

/** Confirmations are explicit, unique and cannot be supplied as File values. */
export function isSingleConfirmedFormValue(formData: FormData, field: string): boolean {
  return readSingleStringFormValue(formData, field) === "yes";
}
