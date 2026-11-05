import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const server = read("lib/imports/historical-anamnesis-server.ts");
const api = read("app/api/admin/clients/[clientId]/historical-excel/route.ts");
const sql = read("supabase/migrations/20261105121000_historical_anamnesis_private_staging.sql");
const screen = read("components/admin/HistoricalExcelReviewForm.tsx");
const workflow = read(".github/workflows/validate-method-configuration-foundation.yml");

test("admin AAL2 and canonical ledger verification occur before secret access", () => {
  assert.match(api, /await requireRole\("admin"\)/);
  assert.match(api, /sameOrigin\(request\)/);
  assert.match(api, /operation === "stage"/);
  assert.match(api, /readBoundedFormData/);
  assert.match(server, /import "server-only"/);
  const a = server.indexOf('await requireRole("admin")');
  const l = server.indexOf('from("historical_initial_load_sources")');
  const priv = server.indexOf("createAdminClient()");
  assert.ok(a >= 0 && l > a && priv > l);
  for (const field of ["source_sha256", "layout_signature_sha256", "proposed_client_id"]) {
    assert.match(server, new RegExp(field));
  }
  assert.match(server, /reviewHistoricalDirectAnamnesisMapping/);
  assert.match(server, /getPublishedHistoricalAnamnesisTargets/);
  assert.match(server, /source\?\.state !== "pending_backend_identity_verification"/);
});

test("original XLSX retention verifies already-uploaded bytes and never publishes health", () => {
  assert.match(server, /historical-originals-private/);
  assert.match(server, /upsert: false/);
  assert.match(server, /\.download\(storagePath\)/);
  assert.match(server, /digest\(new Uint8Array\(await original\.arrayBuffer\(\)\)\)/);
  assert.match(server, /stage_historical_anamnesis_source/);
  assert.doesNotMatch(server, /console\.|createUser|\.from\("anamnesis_submissions"\)|publish|\.update\(/);
  assert.match(sql, /CREATE TABLE public\.historical_anamnesis_imports/);
  assert.match(sql, /UNIQUE \(batch_id, source_id\)/);
  assert.match(sql, /CREATE POLICY historical_originals_never_browser/);
  assert.match(sql, /AS RESTRICTIVE FOR ALL TO public/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.stage_historical_anamnesis_source/);
  assert.match(sql, /confirmed_custody boolean NOT NULL CHECK/);
  assert.match(sql, /current_user <> 'service_role'/);
  assert.doesNotMatch(sql, /ALTER TABLE public\.anamnesis_submissions|CREATE POLICY.*FOR INSERT TO authenticated/);
});

test("UI requires explicit independent human decisions and displays staged state", () => {
  assert.match(screen, /batch_id/);
  assert.match(screen, /source_id/);
  assert.match(screen, /confirmed_identity/);
  assert.match(screen, /confirmed_mapping/);
  assert.match(screen, /confirmed_custody/);
  assert.match(screen, /Guardar histórico privado revisado/);
  assert.match(screen, /Não foi publicada nenhuma Anamnese à cliente/);
  assert.match(workflow, /supabase test db supabase\/tests\/database\/historical_anamnesis_private_staging\.test\.sql/);
});
