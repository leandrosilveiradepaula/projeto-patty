import assert from "node:assert/strict";
import test from "node:test";
import {
  reviewHistoricalDirectAnamnesisMapping,
  DIRECT_ANAMNESIS_MAPPING_VERSION,
} from "./historical-direct-anamnesis-mapping.ts";

const client = "11111111-1111-4111-8111-111111111111";
const version = "22222222-2222-4222-8222-222222222222";
const question = "33333333-3333-4333-8333-333333333333";
const otherQuestion = "44444444-4444-4444-8444-444444444444";
const consent = "55555555-5555-4555-8555-555555555555";

function fixture() {
  return {
    client_id: client, form_version_id: version,
    source: { sha256: "a".repeat(64), column_signature_sha256: "b".repeat(64) },
    cells: [
      { sheet_index: 0, column_index: 2, row_index: 2, raw_type: "s", raw_value: "RESPOSTA_SAUDE_PRIVADA" },
      { sheet_index: 0, column_index: 2, row_index: 3, raw_type: "s", raw_value: "Sim" },
    ],
    selections: [
      { sheet_index: 0, column_index: 2, row_index: 2, question_id: question },
    ],
    questions: [
      { id: question, question_key: "health_history", label: "Saude", answer_type: "text", options: null },
      { id: otherQuestion, question_key: "exercise", label: "Atividade", answer_type: "single_choice", options: ["Sim", "Não"] },
      { id: consent, question_key: "consent_acceptance", label: "Consentimento", answer_type: "single_choice", options: ["Concordo"] },
    ],
  };
}

test("professional mapping of an exact cell remains pending and contains no raw values", () => {
  const x = fixture();
  const a = reviewHistoricalDirectAnamnesisMapping(x);
  const b = reviewHistoricalDirectAnamnesisMapping(x);
  assert.deepEqual(a, b);
  assert.equal(a.version, DIRECT_ANAMNESIS_MAPPING_VERSION);
  assert.equal(a.state, "pending_professional_review");
  assert.equal(a.persistence, "none");
  assert.equal(a.approval, "human_required");
  assert.equal(a.proposed_answer_count, 1);
  assert.match(a.proposal_sha256!, /^[a-f0-9]{64}$/);
  assert.equal(a.errors.length, 0);
  assert.doesNotMatch(JSON.stringify(a), /RESPOSTA_SAUDE_PRIVADA|Saude|Sim|health_history/);
  const changed = fixture();
  changed.cells[0]!.raw_value = "UM_TEXTO_DIFERENTE";
  assert.notEqual(a.proposal_sha256, reviewHistoricalDirectAnamnesisMapping(changed).proposal_sha256);
});

test("mapping is stable regardless of selected order and supports an explicit second field", () => {
  const x = fixture();
  x.selections.push({ sheet_index: 0, column_index: 2, row_index: 3, question_id: otherQuestion });
  const a = reviewHistoricalDirectAnamnesisMapping(x);
  assert.equal(a.state, "pending_professional_review");
  assert.equal(a.proposed_answer_count, 2);
  const reversed = reviewHistoricalDirectAnamnesisMapping({ ...x, selections: [...x.selections].reverse() });
  assert.equal(a.proposal_sha256, reversed.proposal_sha256);
});

test("legal consent can never be imported from historical XLSX", () => {
  const x = fixture();
  x.selections[0] = { ...x.selections[0]!, question_id: consent };
  const result = reviewHistoricalDirectAnamnesisMapping(x);
  assert.equal(result.state, "blocked");
  assert.ok(result.errors.includes("consent_not_importable"));
  assert.equal(result.proposal_sha256, undefined);
});

test("unknown question, duplicate destination, duplicate coordinate, and missing cell all block", () => {
  const dup = fixture();
  dup.selections.push({ sheet_index: 0, column_index: 2, row_index: 3, question_id: question });
  assert.ok(reviewHistoricalDirectAnamnesisMapping(dup).errors.includes("duplicate_question"));
  const duplicateCell = fixture();
  duplicateCell.selections.push({ ...duplicateCell.selections[0]!, question_id: otherQuestion });
  assert.ok(reviewHistoricalDirectAnamnesisMapping(duplicateCell).errors.includes("duplicate_cell"));
  const unknown = fixture();
  unknown.selections[0] = { ...unknown.selections[0]!, question_id: "66666666-6666-4666-8666-666666666666" };
  assert.ok(reviewHistoricalDirectAnamnesisMapping(unknown).errors.includes("target_not_found"));
  const missing = fixture();
  missing.selections[0] = { ...missing.selections[0]!, row_index: 42 };
  assert.ok(reviewHistoricalDirectAnamnesisMapping(missing).errors.includes("cell_missing"));
});

test("wrong single-choice value, unsupported answer types and blank cells fail closed", () => {
  const mismatch = fixture();
  mismatch.selections[0] = { ...mismatch.selections[0]!, question_id: otherQuestion };
  assert.ok(reviewHistoricalDirectAnamnesisMapping(mismatch).errors.includes("answer_option_mismatch"));
  const unsupported = fixture();
  unsupported.questions[0]!.answer_type = "file";
  assert.ok(reviewHistoricalDirectAnamnesisMapping(unsupported).errors.includes("unsupported_target"));
  const empty = fixture();
  empty.cells[0]!.raw_value = "";
  assert.ok(reviewHistoricalDirectAnamnesisMapping(empty).errors.includes("invalid_raw_value"));
});

test("source identity, exact client UUID, and selection caps are mandatory", () => {
  const x = fixture();
  assert.ok(reviewHistoricalDirectAnamnesisMapping({ ...x, client_id: "bad" }).errors.includes("invalid_source"));
  assert.ok(reviewHistoricalDirectAnamnesisMapping({ ...x, form_version_id: "bad" }).errors.includes("invalid_source"));
  assert.ok(reviewHistoricalDirectAnamnesisMapping({ ...x, source: { ...x.source, sha256: "bad" } }).errors.includes("invalid_source"));
  assert.ok(reviewHistoricalDirectAnamnesisMapping({ ...x, selections: [] }).errors.includes("invalid_selection"));
  assert.ok(reviewHistoricalDirectAnamnesisMapping({ ...x, selections: Array.from({ length: 65 }, () => x.selections[0]!) }).errors.includes("invalid_selection"));
});
