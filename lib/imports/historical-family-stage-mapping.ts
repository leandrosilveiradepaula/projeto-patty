import { isUuid } from "../validation/uuid.ts";

export type FamilyStageMapping = Readonly<{
  version: "historical-family-anamnesis-v1";
  column_signature_sha256: string;
  form_version_id: string;
  mappings: readonly Readonly<{
    sheet_index: number;
    column_index: number;
    row_index: number;
    question_id: string;
  }>[];
}>;

const HASH = /^[0-9a-f]{64}$/;
const ALLOWED = ["version", "column_signature_sha256", "form_version_id", "mappings"];
const KEYS = ["sheet_index", "column_index", "row_index", "question_id"];
const exact = (value: object, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

/** Only technical coordinates and canonical IDs; never carry XLSX values or client identities. */
export function parseFamilyStageMapping(
  input: unknown,
  expected: Readonly<{ form_version_id: string; allowed_question_ids: readonly string[] }>,
): FamilyStageMapping {
  const bad = (): never => { throw new Error("historical_family_stage_mapping_blocked"); };
  if (!input || typeof input !== "object" || Array.isArray(input) || !exact(input, ALLOWED)
    || !expected || !isUuid(expected.form_version_id)
    || !Array.isArray(expected.allowed_question_ids)) bad();

  const mapping = input as Record<string, unknown>;
  if (mapping.version !== "historical-family-anamnesis-v1"
    || typeof mapping.column_signature_sha256 !== "string"
    || !HASH.test(mapping.column_signature_sha256)
    || mapping.form_version_id !== expected.form_version_id
    || !Array.isArray(mapping.mappings) || mapping.mappings.length < 1 || mapping.mappings.length > 64) bad();

  const questionIds = new Set(expected.allowed_question_ids);
  const seenQuestions = new Set<string>();
  const seenCells = new Set<string>();
  for (const item of mapping.mappings) {
    if (!item || typeof item !== "object" || Array.isArray(item) || !exact(item, KEYS)) bad();
    if (!Number.isSafeInteger(item.sheet_index) || item.sheet_index < 0 || item.sheet_index >= 64
      || !Number.isSafeInteger(item.column_index) || item.column_index < 1 || item.column_index > 16384
      || !Number.isSafeInteger(item.row_index) || item.row_index < 1 || item.row_index > 9999999
      || typeof item.question_id !== "string" || !isUuid(item.question_id)
      || !questionIds.has(item.question_id)) bad();
    const cell = [item.sheet_index, item.column_index, item.row_index].join(":");
    if (seenCells.has(cell) || seenQuestions.has(item.question_id)) bad();
    seenCells.add(cell);
    seenQuestions.add(item.question_id);
  }
  return mapping as FamilyStageMapping;
}
