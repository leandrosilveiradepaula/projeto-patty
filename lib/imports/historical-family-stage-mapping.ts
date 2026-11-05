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

  const mappings = mapping.mappings;
  if (!Array.isArray(mappings)) bad();
  const questionIds = new Set(expected.allowed_question_ids);
  const seenQuestions = new Set<string>();
  const seenCells = new Set<string>();
  for (const value of (mappings as unknown[])) {
    if (!value || typeof value !== "object" || Array.isArray(value) || !exact(value, KEYS)) bad();
    const item = value as Record<string, unknown>;
    const sheet = item.sheet_index;
    const column = item.column_index;
    const row = item.row_index;
    const question = item.question_id;
    if (typeof sheet !== "number" || !Number.isSafeInteger(sheet) || sheet < 0 || sheet >= 64
      || typeof column !== "number" || !Number.isSafeInteger(column) || column < 1 || column > 16384
      || typeof row !== "number" || !Number.isSafeInteger(row) || row < 1 || row > 9999999
      || typeof question !== "string" || !isUuid(question) || !questionIds.has(question)) bad();
    const cell = [sheet, column, row].join(":");
    const validatedQuestion = question as string;
    if (seenCells.has(cell) || seenQuestions.has(validatedQuestion)) bad();
    seenCells.add(cell);
    seenQuestions.add(validatedQuestion);
  }
  return mapping as unknown as FamilyStageMapping;
}
