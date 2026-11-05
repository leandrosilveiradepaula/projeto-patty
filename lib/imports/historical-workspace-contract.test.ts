import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { previewHistoricalDirectFiles, extractHistoricalDirectXlsxCells } from "./historical-archive-preview.ts";
import { syntheticXlsx, syntheticJpeg, syntheticPng } from "../../tests/fixtures/imports/synthetic-archives.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const page = read("app/admin/clientes/[clienteId]/importacao/page.tsx");
const api = read("app/api/admin/clients/[clientId]/historical-excel/route.ts");
const form = read("components/admin/HistoricalExcelReviewForm.tsx");
const nav = read("components/admin/ClientWorkspaceNav.tsx");

test("client import workspace requires authenticated client-scoped backend and direct Excel", () => {
  assert.match(page, /getClientForPrivateFileAdministration\(clienteId\)/);
  assert.match(page, /if \(!client\) notFound\(\)/);
  assert.match(page, /HistoricalExcelReviewForm clientId=\{client\.id\}/);
  assert.match(page, /AdminPrivateFileUploadForm clientId=\{client\.id\}/);
  assert.match(nav, /href: \x60\$\{base\}\/importacao\x60/);
  assert.match(page, /Não.*ZIP|sem ZIP/i);
  assert.doesNotMatch(page, /createHistoricalClientInternal|createUser|assignment\.insert/);
});

test("historical Excel route authenticates MFA before bounded raw upload and never persists or logs", () => {
  const auth = api.indexOf('await requireRole("admin")');
  const identity = api.indexOf('getClientForPrivateFileAdministration(clientId)');
  const content = api.indexOf('readBoundedFormData(request)', auth);
  assert.ok(auth >= 0 && identity > auth && content > identity);
  assert.match(api, /sameOrigin\(request\)/);
  assert.match(api, /reader\.read\(\)/);
  assert.match(api, /MAX_MULTIPART_BYTES/);
  assert.match(api, /request\.headers\.get\("content-length"\)/);
  assert.match(api, /"Cache-Control": "private, no-store/);
  assert.match(api, /previewHistoricalDirectFiles\(bytes, \[\]\)/);
  assert.match(api, /extractHistoricalDirectXlsxCells/);
  assert.match(api, /MAX_REVIEW_CELLS = 40/);
  assert.match(api, /sha256 !== preview\.excel\.sha256/);
  assert.match(api, /"raw_unapproved"/);
  assert.doesNotMatch(api, /console\.|\.insert\(|\.update\(|\.upsert\(|\.upload\(|createAdminClient|service_role|\.storage\./);
});

test("Excel values require human selection and are not automatically published", () => {
  assert.match(form, /identityConfirmed/);
  assert.match(form, /type="file"/);
  assert.match(form, /accept="\.xlsx/);
  assert.match(form, /Conferir estrutura do Excel/);
  assert.match(form, /Conferir valores originais da coluna/);
  assert.match(form, /Nenhum dado foi gravado/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|console\.|\.insert\(|\.upsert\(/);
});

test("direct Excel and photos remain independent and can be reviewed with synthetic bytes", () => {
  const bytes = syntheticXlsx();
  const preview = previewHistoricalDirectFiles(bytes, [syntheticPng, syntheticJpeg]);
  assert.equal(preview.excel.state, "recognized_unmapped");
  assert.equal(preview.photos.length, 2);
  const source = {
    sha256: preview.excel.sha256!,
    column_signature_sha256: preview.excel.column_signature_sha256!,
  };
  // This synthetic fixture does not provide explicit cell coordinates, so
  // the extractor fails closed rather than inventing a location.
  assert.throws(
    () => extractHistoricalDirectXlsxCells(bytes, source, [{ sheet_index: 0, column_index: 1 }]),
    /historical_direct_xlsx_blocked/,
  );
});
