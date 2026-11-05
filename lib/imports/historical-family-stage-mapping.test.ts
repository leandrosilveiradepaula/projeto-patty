import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseFamilyStageMapping } from "./historical-family-stage-mapping.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const clientPage = read("components/admin/HistoricalInitialLoadLedgerList.tsx");
const screen = read("components/admin/HistoricalFamilyBatchStageForm.tsx");
const exportScreen = read("components/admin/HistoricalExcelReviewForm.tsx");
const server = read("lib/imports/historical-anamnesis-server.ts");
const route = read("app/api/admin/clients/[clientId]/historical-excel/route.ts");

const version = "11111111-1111-4111-8111-111111111111";
const question = "22222222-2222-4222-8222-222222222222";
const hash = "a".repeat(64);
const expected = { form_version_id: version, allowed_question_ids: [question] };
const valid = () => ({
  version: "historical-family-anamnesis-v1",
  column_signature_sha256: hash,
  form_version_id: version,
  mappings: [{ sheet_index: 0, column_index: 1, row_index: 2, question_id: question }],
});

test("metadata map validates canonical published version, coordinates and allowed questions", () => {
  const parsed = parseFamilyStageMapping(valid(), expected);
  assert.equal(parsed.mappings.length, 1);
  assert.equal(parsed.form_version_id, version);
  assert.deepEqual(Object.keys(parsed).sort(), [
    "column_signature_sha256", "form_version_id", "mappings", "version",
  ]);
  for (const patch of [
    { form_version_id: "33333333-3333-4333-8333-333333333333" },
    { column_signature_sha256: "bad" },
    { version: "other" },
    { raw_value: "SENSITIVE" },
    { mappings: [] },
  ]) {
    assert.throws(() => parseFamilyStageMapping({ ...valid(), ...patch }, expected),
      /historical_family_stage_mapping_blocked/);
  }
});

test("reject duplicate questions and cells, wrong types and consent/non-published targets", () => {
  const a = valid();
  const duplicate = { ...a, mappings: [a.mappings[0], { ...a.mappings[0], row_index: 3 }] };
  const sameCell = { ...a, mappings: [a.mappings[0], {
    ...a.mappings[0], question_id: "33333333-3333-4333-8333-333333333333",
  }] };
  for (const invalid of [
    duplicate, sameCell,
    { ...a, mappings: [{ ...a.mappings[0], row_index: 0 }] },
    { ...a, mappings: [{ ...a.mappings[0], sheet_index: 64 }] },
    { ...a, mappings: [{ ...a.mappings[0], column_index: -1 }] },
    { ...a, mappings: [{ ...a.mappings[0], question_id: "33333333-3333-4333-8333-333333333333" }] },
    { ...a, mappings: [{ ...a.mappings[0], raw_value: "PRIVATE" }] },
  ]) assert.throws(() => parseFamilyStageMapping(invalid, expected),
    /historical_family_stage_mapping_blocked/);
  assert.throws(() => parseFamilyStageMapping(a, {
    ...expected, allowed_question_ids: [],
  }), /historical_family_stage_mapping_blocked/);
});

test("family flow keeps approval per source, reuses protected existing route and never includes clinical values", () => {
  assert.match(clientPage, /await requireRole\("admin"\)/);
  assert.match(clientPage, /await createClient\(\)/);
  assert.match(clientPage, /getPublishedHistoricalAnamnesisTargets/);
  assert.match(clientPage, /HistoricalFamilyBatchStageForm/);
  for (const state of ["pending_backend_identity_verification", "source_sha256", "proposed_client_id",
    "layout_signature_sha256", "confirmed_identity", "confirmed_mapping", "confirmed_custody"]) {
    // Confirmation keys are submitted in the family component; others come from the RLS ledger.
    assert.match(clientPage + screen, new RegExp(state));
  }
  assert.match(screen, /MAX_PER_RUN = 5/);
  assert.match(screen, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(screen, /hash !== source\.source_sha256/);
  assert.match(screen, /method: "POST", credentials: "same-origin"/);
  assert.match(screen, /operation", "stage"/);
  assert.match(screen, /\/api\/admin\/clients\//);
  assert.match(screen, /decision\.identity \|\| !decision\.mapping \|\| !decision\.custody/);
  assert.match(server, /stage_historical_anamnesis_source/);
  assert.match(server, /\.eq\("batch_id", params\.batchId\)/);
  assert.match(route, /await requireRole\("admin"\)/);
  assert.match(exportScreen, /Exportar mapa técnico para o lote \(sem respostas\)/);
  assert.doesNotMatch(screen, /console\.|createAdminClient|getPublicUrl\(|\.from\("anamnesis_submissions"\)/);
  assert.doesNotMatch(exportScreen.slice(exportScreen.indexOf("function exportFamilyMapping()"),
    exportScreen.indexOf("function addMapping()")), /raw_value|clientId|full_name/);
});
