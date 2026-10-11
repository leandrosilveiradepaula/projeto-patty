/**
 * Exact read-only match for professional asset registration reconciliation.
 * Only database metadata returned under the caller's existing RLS may be used.
 * A row for a different binary/path cannot be silently treated as success.
 */
export type EducationalAssetRegistrationExpected = {
  byteSize: number;
  contentType: string;
  sha256Hex: string;
  storagePath: string;
};

export type EducationalAssetRegistrationRow = {
  byte_size: number;
  content_type: string;
  sha256_hex: string;
  storage_path: string;
};

export type EducationalAssetRegistrationStatus = "registered" | "not_registered" | "conflict";

export function inspectEducationalAssetRegistration(
  rows: readonly EducationalAssetRegistrationRow[],
  expected: EducationalAssetRegistrationExpected,
): EducationalAssetRegistrationStatus {
  if (rows.length === 0) return "not_registered";
  return rows.some(row =>
    row.byte_size === expected.byteSize &&
    row.content_type === expected.contentType &&
    row.sha256_hex === expected.sha256Hex &&
    row.storage_path === expected.storagePath
  ) ? "registered" : "conflict";
}
