import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isPreviewablePrivateFileMimeType } from "./private-file-preview.ts";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("only previously permitted MIME types may be viewed inline", () => {
  for (const mime of ["application/pdf", "image/jpeg", "image/png", "image/webp"]) {
    assert.equal(isPreviewablePrivateFileMimeType(mime), true);
  }
  for (const mime of [null, undefined, "", "text/html", "image/svg+xml", "application/octet-stream", "application/pdf; charset=utf-8"]) {
    assert.equal(isPreviewablePrivateFileMimeType(mime), false);
  }
});

test("client preview uses client authentication and RLS and preserves download", () => {
  const route = read("app/cliente/arquivos/[fileId]/route.ts");
  assert.match(route, /requireRole\("client"\)/);
  assert.match(route, /getAccessiblePrivateFileForCurrentClientDownload\(fileId\)/);
  assert.match(route, /preview && !isPreviewablePrivateFileMimeType\(file\.mime_type\)/);
  assert.match(route, /searchParams\.get\("preview"\) === "1"/);
  assert.match(route, /preview \? 60 : 300/);
  assert.match(route, /preview \? undefined : \{ download: downloadName \}/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.match(route, /"Referrer-Policy": "no-referrer"/);
  assert.ok(route.indexOf('requireRole("client")') < route.indexOf("getAccessiblePrivateFileForCurrentClientDownload(fileId)"));
  assert.doesNotMatch(route, /createAdminClient|service_role/);
});

test("Patty preview audits exam and document access before issuing signed links", () => {
  const route = read("app/admin/arquivos/[fileId]/route.ts");
  assert.match(route, /requireRole\("admin"\)/);
  assert.match(route, /getAccessiblePrivateFileForAdminDownload\(fileId\)/);
  assert.match(route, /preview && !isPreviewablePrivateFileMimeType\(file\.mime_type\)/);
  assert.equal((route.match(/action: preview \? "view" : "download"/g) ?? []).length, 2);
  assert.match(route, /file\.file_kind === "exam" \|\| file\.file_kind === "document"/);
  assert.match(route, /authorized: false/);
  assert.match(route, /authorized: true/);
  assert.match(route, /return new Response\(null, \{ status: 404 \}\)/);
  assert.match(route, /preview \? undefined : \{ download: downloadName \}/);
  assert.ok(route.indexOf('await recordClientFileAccessEvent({', route.indexOf('if (file.file_kind === "exam"')) < route.indexOf(".createSignedUrl("));
  assert.doesNotMatch(route, /createAdminClient|service_role/);
});

test("both areas provide a safe optional preview while retaining download", () => {
  const admin = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  const client = read("app/cliente/arquivos/page.tsx");
  assert.equal((admin.match(/isPreviewablePrivateFileMimeType\(file\.mime_type\)/g) ?? []).length, 2);
  assert.match(client, /isPreviewablePrivateFileMimeType\(file\.mime_type\)/);
  assert.equal((admin.match(/preview=1/g) ?? []).length, 2);
  assert.equal((client.match(/preview=1/g) ?? []).length, 1);
  for (const page of [admin, client]) {
    assert.match(page, /rel="noopener noreferrer"/);
    assert.match(page, /target="_blank"/);
    assert.match(page, />\s*Visualizar\s*<\/Link>/);
    assert.match(page, />\s*Baixar arquivo\s*<\/Link>/);
  }
  const access = read("lib/supabase/data-access.ts");
  assert.equal((access.match(/select\("id, bucket_id, object_path, original_filename, file_kind, mime_type"\)/g) ?? []).length, 2);
});

test("successful client private upload updates Patty's file workspace", () => {
  const action = read("app/cliente/arquivos/actions.ts");
  assert.match(action, /if \(result\.status === "accepted"\)/);
  assert.match(action, /admin\/clientes/);
  assert.match(action, /revalidatePath/);
});
