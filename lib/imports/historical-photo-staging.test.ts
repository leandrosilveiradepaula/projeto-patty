import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { prepareReviewedHistoricalPhoto } from "./historical-photo-staging.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = (p: string) => readFileSync(path.join(root, p), "utf8");
const bytes = Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,1]);
const sha = createHash("sha256").update(bytes).digest("hex");
const batchId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const sample = () => ({
  batchId, sourceId: "source_0001", clientId, sourceSha256: sha, bytes,
});

test("opaque immutable photo ID/path is reproducible, client-scoped and PII-free", () => {
  const a = prepareReviewedHistoricalPhoto(sample());
  assert.deepEqual(a, prepareReviewedHistoricalPhoto(sample()));
  assert.equal(a.source_sha256, sha);
  assert.equal(a.photo_type, "jpeg");
  assert.equal(a.mime_type, "image/jpeg");
  assert.match(a.client_file_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(a.storage_path, `clients/${clientId}/photo/${a.client_file_id}.jpg`);
  assert.notEqual(a.client_file_id, prepareReviewedHistoricalPhoto({
    ...sample(), clientId: "33333333-3333-4333-8333-333333333333",
  }).client_file_id);
});

test("invalid file, changed hash, oversized payload, bad identity and PDFs blocked", () => {
  for (const patch of [
    { sourceSha256: "0".repeat(64) },
    { sourceId: "source_00001" },
    { clientId: "NOT_A_UUID" },
    { batchId: "NOT_A_UUID" },
    { bytes: Uint8Array.from([0x25,0x50,0x44,0x46,0x2d]) },
    { bytes: new Uint8Array(0) },
    { bytes: new Uint8Array(10 * 1024 * 1024 + 1) },
  ]) {
    assert.throws(() => prepareReviewedHistoricalPhoto({ ...sample(), ...patch }),
      /historical_photo_source_blocked/);
  }
});

test("admin route verifies auth, origin, actual streamed byte count and three attestations", () => {
  const route = file("app/api/admin/clients/[clientId]/historical-photo/route.ts");
  const auth = route.indexOf('await requireRole("admin")');
  const bytes = route.indexOf("await boundedForm(request)");
  assert.ok(auth >= 0 && bytes > auth);
  assert.match(route, /request\.headers\.get\("origin"\)/);
  assert.match(route, /reader\.read\(\)/);
  assert.match(route, /MAX_BODY_BYTES/);
  assert.match(route, /confirmed_identity/);
  assert.match(route, /confirmed_photo/);
  assert.match(route, /confirmed_custody/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /createAdminClient|getPublicUrl|console\./);
});

test("server rechecks ledger RLS, content and private object before RPC", () => {
  const server = file("lib/imports/historical-photo-server.ts");
  assert.match(server, /import "server-only"/);
  assert.match(server, /await requireRole\("admin"\)/);
  assert.match(server, /await createClient\(\)/);
  assert.match(server, /\.eq\("batch_id", photo\.batch_id\)/);
  assert.match(server, /\.eq\("source_id", photo\.source_id\)/);
  assert.match(server, /previewHistoricalDirectFiles/);
  assert.match(server, /upsert: false/);
  assert.match(server, /original\.arrayBuffer\(\)/);
  assert.match(server, /stage_historical_photo_source/);
  assert.doesNotMatch(server, /\.from\("anamnesis_submissions"\)|clientVisibleOnAccept: true|getPublicUrl/);
});

test("migration is RLS append-only, invoker-only, batch-source idempotent and not a release", () => {
  const sql = file("supabase/migrations/20261105223000_historical_photo_private_staging.sql");
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /GRANT SELECT ON public\.historical_photo_imports TO authenticated/);
  assert.match(sql, /SECURITY INVOKER/);
  assert.match(sql, /current_user <> 'service_role'/);
  assert.match(sql, /client_visible_at IS NULL/);
  assert.match(sql, /p_source_sha256/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /UNIQUE \(batch_id, source_id\)/);
  assert.match(sql, /auth\.jwt\(\) ->> 'aal'/);
  assert.doesNotMatch(sql, /CREATE POLICY.+FOR (INSERT|UPDATE|DELETE) TO authenticated/);
  assert.doesNotMatch(sql, /CREATE BUCKET|DROP TABLE|TRUNCATE TABLE/);
  assert.match(file(".github/workflows/validate-method-configuration-foundation.yml"),
    /historical_photo_private_staging\.test\.sql/);
});

test("ledger UI does not claim photographs imported merely by being inventoried", () => {
  const ui = file("components/admin/HistoricalInitialLoadLedgerList.tsx");
  const form = file("components/admin/HistoricalPhotoStageForm.tsx");
  assert.match(ui, /historical_photo_imports/);
  assert.match(ui, /Foto não guardada/);
  assert.match(ui, /Foto guardada — consultar/);
  assert.match(ui, /HistoricalPhotoStageForm/);
  assert.match(form, /!identity \|\| !photoReview \|\| !custody/);
  assert.match(form, /crypto\.subtle\.digest\("SHA-256"/);
  assert.doesNotMatch(form, /getPublicUrl|createAdminClient|console\./);
});
