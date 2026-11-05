import { createHash } from "node:crypto";
import { isUuid } from "../validation/uuid.ts";

export const DIRECT_ANAMNESIS_MAPPING_VERSION = "historical-direct-anamnesis-mapping-v1";

export type HistoricalQuestionTarget = Readonly<{
  id: string;
  question_key: string;
  label: string;
  answer_type: string;
  options: unknown;
}>;

export type HistoricalCellSelection = Readonly<{
  sheet_index: number;
  column_index: number;
  row_index: number;
  question_id: string;
}>;

type RawHistoricalCell = Readonly<{
  sheet_index: number;
  column_index: number;
  row_index: number;
  raw_type: string;
  raw_value: string;
}>;

type MappingError =
  | "invalid_source" | "invalid_version" | "invalid_selection"
  | "duplicate_cell" | "duplicate_question" | "cell_missing"
  | "target_not_found" | "consent_not_importable"
  | "unsupported_target" | "answer_option_mismatch" | "invalid_raw_value";

export type HistoricalAnamnesisMappingReview = Readonly<{
  version: typeof DIRECT_ANAMNESIS_MAPPING_VERSION;
  state: "blocked" | "pending_professional_review";
  persistence: "none";
  approval: "human_required";
  proposed_answer_count: number;
  proposal_sha256?: string;
  errors: readonly MappingError[];
}>;

const HASH = /^[a-f0-9]{64}$/;
const DISALLOWED_KEY = "consent_acceptance";

function blocked(errors: readonly MappingError[], count = 0): HistoricalAnamnesisMappingReview {
  return {
    version: DIRECT_ANAMNESIS_MAPPING_VERSION,
    state: "blocked",
    persistence: "none",
    approval: "human_required",
    proposed_answer_count: count,
    errors: [...new Set(errors)].sort(),
  };
}

/**
 * Validates an explicit, professional-authored set of exact XLSX cells -> exact
 * canonical Anamnesis question IDs. It NEVER authorizes a write.
 *
 * Source values are used only in memory for validation / the final SHA-256.
 * Neither values nor labels, names, email or medical data appear in results.
 * Historical answers MUST NOT be inserted into current client submissions.
 */
export function reviewHistoricalDirectAnamnesisMapping(input: Readonly<{
  client_id: string;
  form_version_id: string;
  source: Readonly<{ sha256: string; column_signature_sha256: string }>;
  cells: readonly RawHistoricalCell[];
  selections: readonly HistoricalCellSelection[];
  questions: readonly HistoricalQuestionTarget[];
}>): HistoricalAnamnesisMappingReview {
  if (!input || !isUuid(input.client_id) || !isUuid(input.form_version_id)
    || !input.source || !HASH.test(input.source.sha256)
    || !HASH.test(input.source.column_signature_sha256)) return blocked(["invalid_source"]);

  if (!Array.isArray(input.selections) || input.selections.length < 1
    || input.selections.length > 64 || !Array.isArray(input.cells)
    || !Array.isArray(input.questions) || input.questions.length > 200) {
    return blocked(["invalid_selection"]);
  }

  const errors: MappingError[] = [];
  const keys = new Set<string>();
  const destinations = new Set<string>();
  const questions = new Map<string, HistoricalQuestionTarget>();
  for (const question of input.questions) {
    if (!question || !isUuid(question.id) || typeof question.question_key !== "string"
      || questions.has(question.id)) return blocked(["invalid_version"]);
    questions.set(question.id, question);
  }
  const cells = new Map<string, RawHistoricalCell>();
  for (const cell of input.cells) {
    if (!cell || !Number.isSafeInteger(cell.sheet_index) || !Number.isSafeInteger(cell.column_index)
      || !Number.isSafeInteger(cell.row_index) || typeof cell.raw_value !== "string") {
      return blocked(["invalid_raw_value"]);
    }
    const key = [cell.sheet_index, cell.column_index, cell.row_index].join(":");
    if (cells.has(key)) return blocked(["duplicate_cell"]);
    cells.set(key, cell);
  }

  const canonical: Array<{ sheet_index: number; column_index: number; row_index: number; question_id: string; value: string }> = [];
  for (const selected of input.selections) {
    if (!selected || !Number.isSafeInteger(selected.sheet_index) || selected.sheet_index < 0
      || selected.sheet_index > 63 || !Number.isSafeInteger(selected.column_index)
      || selected.column_index < 1 || selected.column_index > 16384
      || !Number.isSafeInteger(selected.row_index) || selected.row_index < 1
      || selected.row_index > 9999999 || !isUuid(selected.question_id)) {
      errors.push("invalid_selection");
      continue;
    }
    const cellKey = [selected.sheet_index, selected.column_index, selected.row_index].join(":");
    if (keys.has(cellKey)) errors.push("duplicate_cell");
    keys.add(cellKey);
    if (destinations.has(selected.question_id)) errors.push("duplicate_question");
    destinations.add(selected.question_id);
    const cell = cells.get(cellKey);
    const question = questions.get(selected.question_id);
    if (!cell) errors.push("cell_missing");
    if (!question) errors.push("target_not_found");
    if (!cell || !question) continue;
    if (question.question_key === DISALLOWED_KEY) errors.push("consent_not_importable");
    if (question.answer_type !== "text" && question.answer_type !== "single_choice") {
      errors.push("unsupported_target");
    }
    if (cell.raw_value.length === 0 || cell.raw_value.length > 4096 || cell.raw_value.includes("\0")) {
      errors.push("invalid_raw_value");
    }
    if (question.answer_type === "single_choice"
      && (!Array.isArray(question.options) || !question.options.every((option: unknown) => typeof option === "string")
        || !question.options.includes(cell.raw_value))) {
      errors.push("answer_option_mismatch");
    }
    canonical.push({
      sheet_index: selected.sheet_index, column_index: selected.column_index,
      row_index: selected.row_index, question_id: selected.question_id, value: cell.raw_value,
    });
  }
  if (errors.length > 0) return blocked(errors, input.selections.length);

  canonical.sort((a, b) => a.question_id.localeCompare(b.question_id));
  const proposal_sha256 = createHash("sha256").update(JSON.stringify({
    version: DIRECT_ANAMNESIS_MAPPING_VERSION,
    client_id: input.client_id, form_version_id: input.form_version_id,
    source: input.source, mappings: canonical,
  }), "utf8").digest("hex");
  return {
    version: DIRECT_ANAMNESIS_MAPPING_VERSION,
    state: "pending_professional_review",
    persistence: "none",
    approval: "human_required",
    proposed_answer_count: canonical.length,
    proposal_sha256,
    errors: [],
  };
}
