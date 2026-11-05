import assert from "node:assert/strict";
import test from "node:test";
import { previewHistoricalDirectFiles } from "./historical-archive-preview.ts";
import { syntheticJpeg, syntheticPng, syntheticXlsx, syntheticZip, text } from "../../tests/fixtures/imports/synthetic-archives.ts";

test("reads a standalone XLSX and separate synthetic photo files without an outer ZIP", () => {
  const result = previewHistoricalDirectFiles(syntheticXlsx(), [syntheticPng, syntheticJpeg]);
  assert.equal(result.version, "historical-direct-files-v1");
  assert.equal(result.mode, "dry_run");
  assert.equal(result.persistence, "none");
  assert.equal(result.import_allowed, false);
  assert.equal(result.excel.state, "recognized_unmapped");
  assert.equal(result.excel.worksheet_count, 1);
  assert.match(result.excel.sha256!, /^[a-f0-9]{64}$/);
  assert.match(result.excel.column_signature_sha256!, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.photos.map((photo) => photo.state), ["candidate_private_photo", "candidate_private_photo"]);
  assert.deepEqual(result.photos.map((photo) => photo.kind), ["png", "jpeg"]);
  assert.doesNotMatch(JSON.stringify(result), /Data|Medida|01\/02|1234|cliente|private-photo/);
  assert.deepEqual(result, previewHistoricalDirectFiles(syntheticXlsx(), [syntheticPng, syntheticJpeg]));
});

test("rejects a transport ZIP where a standalone Excel is expected", () => {
  const wrong = syntheticZip([{ name: "cliente.xlsx", bytes: syntheticXlsx() }]);
  const result = previewHistoricalDirectFiles(wrong, [syntheticPng]);
  assert.equal(result.excel.state, "blocked");
  assert.equal(result.import_allowed, false);
  assert.doesNotMatch(JSON.stringify(result), /cliente\.xlsx/);
});

test("rejects malformed Excel, unsupported photos and duplicate photos, never importing", () => {
  const bad = previewHistoricalDirectFiles(text("NOME_PRIVADO"), [text("FOTO_PRIVADA"), syntheticPng, syntheticPng]);
  assert.equal(bad.excel.state, "blocked");
  assert.deepEqual(bad.photos.map((photo) => photo.state), ["blocked", "candidate_private_photo", "blocked"]);
  assert.equal(bad.import_allowed, false);
  assert.doesNotMatch(JSON.stringify(bad), /NOME_PRIVADO|FOTO_PRIVADA/);
});

test("oversized number of photos fails closed instead of silently dropping inputs", () => {
  const photos = Array.from({ length: 101 }, () => syntheticPng);
  const result = previewHistoricalDirectFiles(syntheticXlsx(), photos);
  assert.equal(result.excel.state, "blocked");
  assert.deepEqual(result.photos, [{ state: "blocked" }]);
});
