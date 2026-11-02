import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/files/private-file-admin.ts", "utf8");
const route = readFileSync("app/admin/arquivos/[fileId]/route.ts", "utf8");
const detail = readFileSync("app/admin/clientes/[clienteId]/arquivos/page.tsx", "utf8");
const storageMigration = readFileSync("supabase/migrations/20261020191000_fix_private_storage_admin_read_after_assignment.sql", "utf8");
const globalReadMigration = readFileSync("supabase/migrations/20261101121000_admin_global_read_aal2.sql", "utf8");

function bodyOf(name) {
  const start = source.indexOf("export async function " + name + "(");
  assert.ok(start !== -1, name + " exists");
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

test("private directory uses authenticated admin session, not service-role reads", () => {
  for (const name of [
    "listClientsForPrivateFileAdministration",
    "getClientForPrivateFileAdministration",
  ]) {
    const body = bodyOf(name);
    assert.match(body, /await requireRole\("admin"\)/);
    assert.match(body, /await createClient\(\)/);
    assert.ok(body.indexOf('requireRole("admin")') < body.indexOf("createClient()"));
    assert.match(body, /\.from\("clients"\)/);
    assert.doesNotMatch(body, /createAdminClient|service_role|client_assignments/);
  }
});

test("private file reading keeps signed URLs, audit, and client RLS", () => {
  assert.match(route, /await requireRole\("admin"\)/);
  assert.match(route, /getAccessiblePrivateFileForAdminDownload\(fileId\)/);
  assert.match(route, /recordClientFileAccessEvent/);
  assert.match(route, /createSignedUrl/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.match(detail, /getClientForPrivateFileAdministration\(clienteId\)/);
  assert.match(detail, /listAccessibleClientFiles\(clienteId\)/);
  assert.match(storageMigration, /storage_objects_admin_mfa_aal2_required/);
  assert.match(globalReadMigration, /'clients'/);
  assert.match(globalReadMigration, /'profiles'/);
  assert.match(globalReadMigration, /admin_global_select_aal2/);
});

test("privileged private file writes still keep their separate controlled lifecycle", () => {
  const upload = bodyOf("createAdminPrivateFileUploadSession");
  const release = bodyOf("releasePrivateFileToClient");
  assert.match(upload, /createAdminClient\(\)/);
  assert.match(release, /createAdminClient\(\)/);
  assert.match(release, /client_visible_at/);
  assert.match(release, /actorProfileId/);
});
