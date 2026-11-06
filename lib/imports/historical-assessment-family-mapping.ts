import type { HistoricalMeasurementSelection } from "./historical-assessment-review.ts";

/** Metadata-only template: dates and client IDs must be reviewed for EACH source. */
export const ASSESSMENT_FAMILY_MAPPING_VERSION = "historical-assessment-family-v1";
export type AssessmentFamilyMapping = Readonly<{
  version: typeof ASSESSMENT_FAMILY_MAPPING_VERSION;
  column_signature_sha256: string;
  measurements: readonly HistoricalMeasurementSelection[];
}>;

const HASH = /^[a-f0-9]{64}$/;
const KEY = /^[a-z][a-z0-9_]{1,119}$/;
const UNIT = /^[A-Za-z][A-Za-z0-9_%/.-]{0,39}$/;
const ROOT_KEYS = ["version", "column_signature_sha256", "measurements"];
const ITEM_KEYS = ["sheet_index", "column_index", "row_index", "measurement_key", "unit"];
const exact = (obj: object, keys: readonly string[]) =>
  Object.keys(obj).length === keys.length && keys.every(k => Object.hasOwn(obj,k));
const blocked = (): never => { throw new Error("historical_assessment_family_mapping_blocked"); };

export function parseAssessmentFamilyMapping(value: unknown): AssessmentFamilyMapping {
  if (!value || typeof value !== "object" || Array.isArray(value) || !exact(value,ROOT_KEYS)) blocked();
  const map = value as Record<string,unknown>;
  if (map.version !== ASSESSMENT_FAMILY_MAPPING_VERSION
    || typeof map.column_signature_sha256 !== "string"
    || !HASH.test(map.column_signature_sha256)
    || !Array.isArray(map.measurements)
    || map.measurements.length < 1 || map.measurements.length > 40) blocked();
  const usedCells = new Set<string>();
  const usedKeys = new Set<string>();
  const measurements: HistoricalMeasurementSelection[] = [];
  for (const raw of map.measurements as unknown[]) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !exact(raw,ITEM_KEYS)) blocked();
    const m=raw as Record<string,unknown>;
    if (typeof m.sheet_index !== "number" || !Number.isSafeInteger(m.sheet_index)
      || m.sheet_index < 0 || m.sheet_index >= 64
      || typeof m.column_index !== "number" || !Number.isSafeInteger(m.column_index)
      || m.column_index < 1 || m.column_index > 16384
      || typeof m.row_index !== "number" || !Number.isSafeInteger(m.row_index)
      || m.row_index < 1 || m.row_index > 9999999
      || typeof m.measurement_key !== "string" || !KEY.test(m.measurement_key)
      || typeof m.unit !== "string" || !UNIT.test(m.unit)) blocked();
    const cell = m.sheet_index + ":" + m.column_index + ":" + m.row_index;
    if (usedCells.has(cell) || usedKeys.has(m.measurement_key as string)) blocked();
    usedCells.add(cell); usedKeys.add(m.measurement_key as string);
    measurements.push({
      sheet_index:m.sheet_index, column_index:m.column_index, row_index:m.row_index,
      measurement_key:m.measurement_key,unit:m.unit,
    } as HistoricalMeasurementSelection);
  }
  return {version:ASSESSMENT_FAMILY_MAPPING_VERSION,
    column_signature_sha256:map.column_signature_sha256 as string,measurements};
}
