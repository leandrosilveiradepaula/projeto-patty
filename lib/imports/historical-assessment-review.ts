import { createHash } from "node:crypto";
import { isUuid } from "../validation/uuid.ts";

export const HISTORICAL_ASSESSMENT_REVIEW_VERSION = "historical-assessment-review-v1";
export type HistoricalMeasurementSelection = Readonly<{
  sheet_index: number;
  column_index: number;
  row_index: number;
  measurement_key: string;
  unit: string;
}>;
export type HistoricalAssessmentCell = Readonly<{
  sheet_index: number;
  column_index: number;
  row_index: number;
  raw_type: string;
  raw_value: string;
}>;

export type HistoricalAssessmentReview = Readonly<{
  state: "blocked" | "pending_professional_review";
  persistence: "none";
  approval: "human_required";
  proposed_measurement_count: number;
  proposal_sha256?: string;
  errors: readonly string[];
}>;

const HASH = /^[a-f0-9]{64}$/;
const KEY = /^[a-z][a-z0-9_]{1,119}$/;
const UNIT = /^[A-Za-z][A-Za-z0-9_%/.-]{0,39}$/;
const DECIMAL = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/;
const keys = ["sheet_index", "column_index", "row_index", "measurement_key", "unit"];

function fail(errors: readonly string[]): HistoricalAssessmentReview {
  return { state: "blocked", persistence: "none", approval: "human_required",
    proposed_measurement_count: 0, errors: [...new Set(errors)].sort() };
}
function dateIsValid(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || value.startsWith("0000-")) return false;
  const parsed = new Date(value + "T12:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validateHistoricalMeasurementSelections(
  value: unknown,
): readonly HistoricalMeasurementSelection[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) return null;
  const seenCells = new Set<string>();
  const seenDestinations = new Set<string>();
  for (const raw of value as unknown[]) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (Object.keys(item).length !== keys.length || !keys.every((key) => Object.hasOwn(item, key))
      || typeof item.sheet_index !== "number" || !Number.isSafeInteger(item.sheet_index)
      || item.sheet_index < 0 || item.sheet_index >= 64
      || typeof item.column_index !== "number" || !Number.isSafeInteger(item.column_index)
      || item.column_index < 1 || item.column_index > 16384
      || typeof item.row_index !== "number" || !Number.isSafeInteger(item.row_index)
      || item.row_index < 1 || item.row_index > 9999999
      || typeof item.measurement_key !== "string" || !KEY.test(item.measurement_key)
      || typeof item.unit !== "string" || !UNIT.test(item.unit)) return null;
    const cell = [item.sheet_index, item.column_index, item.row_index].join(":");
    if (seenCells.has(cell) || seenDestinations.has(item.measurement_key)) return null;
    seenCells.add(cell);
    seenDestinations.add(item.measurement_key);
  }
  return value as HistoricalMeasurementSelection[];
}

/**
 * Independent, read-only review. No interpretation of measurement type/unit,
 * assessment kind or date. Preserves exact original raw values in the digest
 * but never returns those values in the review.
 */
export function reviewHistoricalAssessmentMeasurements(input: Readonly<{
  clientId: string;
  sourceSha256: string;
  layoutSha256: string;
  assessedOn: string;
  cells: readonly HistoricalAssessmentCell[];
  selections: unknown;
}>): HistoricalAssessmentReview {
  if (!input || !isUuid(input.clientId) || !HASH.test(input.sourceSha256)
    || !HASH.test(input.layoutSha256) || !dateIsValid(input.assessedOn)) {
    return fail(["invalid_source_or_date"]);
  }
  const selections = validateHistoricalMeasurementSelections(input.selections);
  if (!selections || !Array.isArray(input.cells) || input.cells.length > 250000)
    return fail(["invalid_measurements"]);
  const found = new Map<string, HistoricalAssessmentCell>();
  for (const cell of input.cells) {
    if (!cell || !Number.isSafeInteger(cell.sheet_index)
      || !Number.isSafeInteger(cell.column_index) || !Number.isSafeInteger(cell.row_index)
      || typeof cell.raw_type !== "string" || typeof cell.raw_value !== "string") {
      return fail(["invalid_original_cell"]);
    }
    const key = [cell.sheet_index, cell.column_index, cell.row_index].join(":");
    if (found.has(key)) return fail(["duplicate_original_cell"]);
    found.set(key, cell);
  }
  const canonical: Array<HistoricalMeasurementSelection & { raw_type: string; raw_value: string; numeric_value: string }> = [];
  for (const selection of selections) {
    const cell = found.get([selection.sheet_index, selection.column_index, selection.row_index].join(":"));
    if (!cell) return fail(["missing_original_cell"]);
    if (!["n", "s", "str", "inlineStr"].includes(cell.raw_type)
      || cell.raw_value.trim() !== cell.raw_value || !DECIMAL.test(cell.raw_value)
      || cell.raw_value.length > 100) return fail(["ambiguous_numeric_value"]);
    const number = Number(cell.raw_value.replace(",", "."));
    if (!Number.isFinite(number)) return fail(["invalid_numeric_value"]);
    canonical.push({ ...selection, raw_type: cell.raw_type, raw_value: cell.raw_value,
      numeric_value: String(number) });
  }
  canonical.sort((a,b) => a.measurement_key.localeCompare(b.measurement_key));
  const proposal_sha256 = createHash("sha256").update(JSON.stringify({
    version: HISTORICAL_ASSESSMENT_REVIEW_VERSION,
    client_id: input.clientId, source_sha256: input.sourceSha256,
    layout_sha256: input.layoutSha256, assessed_on: input.assessedOn,
    measurements: canonical,
  }), "utf8").digest("hex");
  return { state: "pending_professional_review", persistence: "none",
    approval: "human_required", proposed_measurement_count: canonical.length,
    proposal_sha256, errors: [] };
}
