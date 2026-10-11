import { isUuid } from "../validation/uuid.ts";

// Values from hidden fields are a concurrency snapshot, never authorization.
// Nullable labels must distinguish a database NULL from an empty string.
export type OriginalDraftLabel = { valid: true; value: string | null } | { valid: false };

export function serializeOriginalDraftLabel(label: string | null): string {
  return JSON.stringify(label);
}

export function parseOriginalDraftLabel(value: FormDataEntryValue | null): OriginalDraftLabel {
  if (typeof value !== "string" || value.length > 10_000) return { valid: false };
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && typeof parsed !== "string") return { valid: false };
    return { valid: true, value: parsed };
  } catch {
    return { valid: false };
  }
}

// The database uses numeric(12,4). This is NOT the separate editable dose cap.
export function parseOriginalDraftDoseQuantity(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^(?:\d{1,8}(?:\.\d{1,4})?|\.\d{1,4})$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 && numeric <= 99_999_999.9999 ? numeric : null;
}

export function parseOriginalDraftPosition(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isInteger(number) && number <= 2_147_483_647 ? number : null;
}

export type OriginalDraftDoseType = "protein" | "carbohydrate" | "fat";
export function parseOriginalDraftDoseType(value: FormDataEntryValue | null): OriginalDraftDoseType | null {
  return value === "protein" || value === "carbohydrate" || value === "fat" ? value : null;
}

export function parseOriginalDraftId(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && isUuid(value) ? value : null;
}

// Variant keys are opaque identifiers, not labels or professional phase names.
export function parseOriginalVariantKey(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 2048 ? value : null;
}
