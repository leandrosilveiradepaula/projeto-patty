import assert from "node:assert/strict";
import test from "node:test";
import { planHistoricalInitialLoad } from "./historical-initial-load.ts";
import { syntheticXlsx, syntheticPng, syntheticJpeg, text } from "../../tests/fixtures/imports/synthetic-archives.ts";

const clientA = "11111111-1111-4111-8111-111111111111";
const clientB = "22222222-2222-4222-8222-222222222222";
const excel = { kind: "xlsx" as const, bytes: syntheticXlsx() };
const photo = { kind: "photo" as const, bytes: syntheticPng };
const jpeg = { kind: "photo" as const, bytes: syntheticJpeg };

test("an entire initial-load census is deterministic and groups layouts without importing", () => {
  const a = planHistoricalInitialLoad([excel, photo, jpeg]);
  const b = planHistoricalInitialLoad([jpeg, excel, photo]);
  assert.deepEqual(a, b);
  assert.equal(a.import_allowed, false);
  assert.equal(a.persistence, "none");
  assert.deepEqual(a.totals, {
    files: 3, excels: 1, photos: 2, layouts: 1, blocked: 0,
    duplicate_binary: 0, pending_human_association: 3,
    pending_backend_identity_verification: 0,
  });
  assert.equal(a.xlsx_layout_groups[0]!.status, "human_mapping_required");
  assert.deepEqual(a.client_groups, []);
  assert.doesNotMatch(JSON.stringify(a), /Data|Medida|01\/02\/2026|1234|cliente|\.xlsx|\.png/);
});

test("human-client associations never authorize identity or writes", () => {
  const preview = planHistoricalInitialLoad([excel, photo]);
  const excelHash = preview.files.find((f) => f.kind === "xlsx")!.sha256;
  const photoHash = preview.files.find((f) => f.kind === "photo")!.sha256;
  const approved = planHistoricalInitialLoad([photo, excel], [
    { sha256: excelHash, client_id: clientA }, { sha256: photoHash, client_id: clientA },
  ]);
  assert.equal(approved.totals.pending_backend_identity_verification, 2);
  assert.equal(approved.import_allowed, false);
  assert.equal(approved.client_groups[0]!.client_id, clientA);
  assert.equal(approved.client_groups[0]!.source_ids.length, 2);
});

test("identical binaries are never silently deduplicated", () => {
  const result = planHistoricalInitialLoad([excel, photo, excel, photo]);
  assert.equal(result.totals.duplicate_binary, 4);
  assert.equal(result.totals.pending_backend_identity_verification, 0);
  assert.equal(result.import_allowed, false);
});

test("contradictory, repeated and unrecognized decisions fail closed without personal data", () => {
  const source = planHistoricalInitialLoad([excel]);
  const hash = source.files[0]!.sha256;
  const conflicting = planHistoricalInitialLoad([excel], [
    { sha256: hash, client_id: clientA }, { sha256: hash, client_id: clientB },
  ]);
  assert.equal(conflicting.files[0]!.state, "blocked");
  assert.equal(conflicting.files[0]!.reason, "ambiguous_association");
  assert.equal(conflicting.totals.blocked, 1);
  const duplicates = planHistoricalInitialLoad([excel], [
    { sha256: hash, client_id: clientA }, { sha256: hash, client_id: clientA },
  ]);
  assert.ok(duplicates.input_errors.includes("duplicate_association"));
  const unknown = planHistoricalInitialLoad([excel], [
    { sha256: "a".repeat(64), client_id: clientA },
  ]);
  assert.ok(unknown.input_errors.includes("unknown_association"));
  assert.equal(unknown.import_allowed, false);
  const bad = planHistoricalInitialLoad([excel], [{ sha256: hash, client_id: "NOME PRIVADO" }]);
  assert.ok(bad.input_errors.includes("invalid_association"));
  assert.doesNotMatch(JSON.stringify(bad), /NOME PRIVADO/);
});

test("invalid independent XLSX, non-image and outer transport ZIP are blocked", () => {
  const malformedExcel = { kind: "xlsx" as const, bytes: text("DADO_SAUDE_PRIVADO") };
  const unknownPhoto = { kind: "photo" as const, bytes: text("FOTO_SINTETICA_PRIVADA") };
  const result = planHistoricalInitialLoad([malformedExcel, unknownPhoto, { kind: "xlsx", bytes: photo.bytes }]);
  assert.equal(result.totals.blocked, 3);
  assert.equal(result.import_allowed, false);
  assert.doesNotMatch(JSON.stringify(result), /DADO_SAUDE_PRIVADO|FOTO_SINTETICA_PRIVADA/);
});

test("empty and oversized input fail with a generic error", () => {
  assert.throws(() => planHistoricalInitialLoad([]), /historical_initial_load_input_blocked/);
  assert.throws(
    () => planHistoricalInitialLoad(Array.from({ length: 1201 }, () => photo)),
    /historical_initial_load_input_blocked/,
  );
});
