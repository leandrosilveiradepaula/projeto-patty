import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { syntheticZip, text } from "../../tests/fixtures/imports/synthetic-archives.ts";
import { previewHistoricalDirectFiles } from "./historical-archive-preview.ts";
import { reviewHistoricalFamilyBatch } from "./historical-family-batch.ts";

const clientA = "11111111-1111-4111-8111-111111111111";
const clientB = "22222222-2222-4222-8222-222222222222";
const version = "33333333-3333-4333-8333-333333333333";
const questionId = "44444444-4444-4444-8444-444444444444";
const consentId = "55555555-5555-4555-8555-555555555555";

function workbook(value: string) {
  return syntheticZip([
    { name: "[Content_Types].xml", bytes: text("<Types/>") },
    { name: "xl/workbook.xml", bytes: text('<workbook><sheets><sheet name="S1" sheetId="1"/></sheets></workbook>') },
    { name: "xl/worksheets/sheet1.xml", bytes: text(
      `<worksheet><sheetData><row r="1"><c r="A1" t="str"><v>HEADER</v></c></row><row r="2"><c r="A2" t="str"><v>${value}</v></c></row></sheetData></worksheet>`,
    ) },
  ]);
}
const xlsxA = workbook("SYNTHETIC_ANSWER_ALPHA");
const xlsxB = workbook("SYNTHETIC_ANSWER_BRAVO");
const xlsxOther = syntheticZip([
  { name: "[Content_Types].xml", bytes: text("<Types/>") },
  { name: "xl/workbook.xml", bytes: text('<workbook><sheets><sheet name="S1" sheetId="1"/></sheets></workbook>') },
  { name: "xl/worksheets/sheet1.xml", bytes: text('<worksheet><sheetData><row r="1"><c r="B1" t="str"><v>OTHER</v></c></row></sheetData></worksheet>') },
]);
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const preview = previewHistoricalDirectFiles(xlsxA, []);
const signature = preview.excel.column_signature_sha256!;
const questions = [
  { id: questionId, question_key: "daily_routine", label: "Sintética", answer_type: "text", options: null },
  { id: consentId, question_key: "consent_acceptance", label: "Consentimento", answer_type: "single_choice", options: ["Aceito"] },
];
function fixture() {
  return {
    family: {
      version: "historical-family-anamnesis-v1" as const,
      column_signature_sha256: signature,
      form_version_id: version,
      mappings: [{ sheet_index: 0, column_index: 1, row_index: 2, question_id: questionId }],
    },
    sources: [
      { source_id: "source_0001", sha256: hash(xlsxA), bytes: xlsxA, proposed_client_id: clientA },
      { source_id: "source_0002", sha256: hash(xlsxB), bytes: xlsxB, proposed_client_id: clientB },
    ],
    questions,
  };
}

test("two different clients, one source-layout mapping, no clinical values returned", () => {
  const a = fixture();
  assert.equal(preview.excel.state, "recognized_unmapped");
  assert.equal(previewHistoricalDirectFiles(xlsxB, []).excel.column_signature_sha256, signature);
  const result = reviewHistoricalFamilyBatch(a);
  assert.equal(result.totals.files, 2);
  assert.equal(result.totals.pending_professional_review, 2);
  assert.equal(result.import_allowed, false);
  assert.equal(result.persistence, "none");
  assert.equal(result.sources[0]?.proposed_client_id, clientA);
  assert.equal(result.sources[1]?.proposed_client_id, clientB);
  assert.notEqual(result.sources[0]?.proposal_sha256, result.sources[1]?.proposal_sha256);
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_ANSWER|HEADER|\.xlsx|health|daily_routine/);
  assert.deepEqual(result, reviewHistoricalFamilyBatch({ ...a, sources: [...a.sources].reverse() }));
});

test("source tampering and layout mismatches are marked, not silently dropped", () => {
  const a = fixture();
  a.sources[0] = { ...a.sources[0]!, sha256: "a".repeat(64) };
  a.sources[1] = { ...a.sources[1]!, bytes: xlsxOther, sha256: hash(xlsxOther) };
  const result = reviewHistoricalFamilyBatch(a);
  assert.equal(result.totals.blocked, 2);
  assert.deepEqual(result.sources.map((x) => x.reason), ["invalid_source", "layout_mismatch"]);
});

test("missing human association is a pending task, never a verified client", () => {
  const a = fixture();
  a.sources[0] = { source_id: "source_0001", sha256: hash(xlsxA), bytes: xlsxA };
  const result = reviewHistoricalFamilyBatch(a);
  assert.equal(result.sources[0]?.state, "pending_human_association");
  assert.equal(result.totals.pending_human_association, 1);
  assert.equal(result.totals.pending_professional_review, 1);
  assert.equal(result.import_allowed, false);
});

test("duplicate source binaries fail even if different Clients are proposed", () => {
  const a = fixture();
  a.sources[1] = { ...a.sources[1]!, sha256: hash(xlsxA), bytes: xlsxA };
  const result = reviewHistoricalFamilyBatch(a);
  assert.deepEqual(result.sources.map((s) => s.reason), ["duplicate_binary", "duplicate_binary"]);
});

test("missing cells and incorrect target type fail closed", () => {
  const a = fixture();
  a.family.mappings[0]!.row_index = 99;
  assert.equal(reviewHistoricalFamilyBatch(a).sources[0]?.reason, "cell_mapping_blocked");
  a.family.mappings[0]!.row_index = 2;
  a.family.mappings[0]!.question_id = consentId;
  assert.equal(reviewHistoricalFamilyBatch(a).sources[0]?.reason, "cell_mapping_blocked");
});

test("malformed family and non-unique IDs block without echoing private input", () => {
  const a = fixture();
  a.sources[1]!.source_id = "source_0001";
  assert.throws(() => reviewHistoricalFamilyBatch(a), /historical_family_mapping_blocked/);
  const b = fixture();
  b.family.mappings.push({ ...b.family.mappings[0]! });
  assert.throws(() => reviewHistoricalFamilyBatch(b), /historical_family_mapping_blocked/);
  const c = fixture();
  c.family.column_signature_sha256 = "private";
  assert.throws(() => reviewHistoricalFamilyBatch(c),
    (error: unknown) => error instanceof Error && error.message === "historical_family_mapping_blocked");
});
