import {
  validateHistoricalRegistrationSelections,
  type HistoricalRegistrationSelection,
} from "./historical-registration-review.ts";

export const REGISTRATION_FAMILY_MAPPING_VERSION = "historical-registration-family-v1";
export type RegistrationFamilyMapping = Readonly<{
  version: typeof REGISTRATION_FAMILY_MAPPING_VERSION;
  column_signature_sha256: string;
  fields: readonly HistoricalRegistrationSelection[];
}>;
const HASH = /^[0-9a-f]{64}$/;
const MAP_FIELDS = ["version","column_signature_sha256","fields"];
const invalid = (): never => { throw new Error("historical_registration_family_mapping_blocked"); };

/** Strict metadata-only family mapping. Never accept a client ID or raw XLSX data. */
export function parseRegistrationFamilyMapping(input: unknown): RegistrationFamilyMapping {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const map = input as Record<string, unknown>;
  if (Object.keys(map).length !== MAP_FIELDS.length
    || !MAP_FIELDS.every(k => Object.hasOwn(map,k))
    || map.version !== REGISTRATION_FAMILY_MAPPING_VERSION
    || typeof map.column_signature_sha256 !== "string"
    || !HASH.test(map.column_signature_sha256)) invalid();
  const fields = validateHistoricalRegistrationSelections(map.fields);
  if (!fields) throw new Error("historical_registration_family_mapping_blocked");
  return {
    version: REGISTRATION_FAMILY_MAPPING_VERSION,
    column_signature_sha256: map.column_signature_sha256 as string,
    fields: fields.map(s => ({
      sheet_index:s.sheet_index,
      column_index:s.column_index,
      row_index:s.row_index,
      field_key:s.field_key,
    })),
  };
}
