import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("private file directory preserves inactive history with clear navigation", () => {
  const page = read("app/admin/arquivos/page.tsx");
  const access = read("lib/files/private-file-admin.ts");
  assert.match(page, /orderClientsForPrivateFileDirectory/);
  assert.match(page, /client.status === "inactive"/);
  assert.match(page, /Cliente inativa/);
  assert.match(page, /Limpar busca/);
  assert.match(access, /id, profile_id, full_name, status, created_at/);
});

test("real administrative directory controls handle repeated search query keys", () => {
  for (const path of ["app/admin/arquivos/page.tsx", "app/admin/clientes/page.tsx", "app/admin/exercicios/page.tsx", "app/admin/configuracoes/page.tsx"]) {
    const page = read(path);
    assert.match(page, path.includes("exercicios") ? /readExerciseCatalogTerm\(q\)/ : /readClientDirectorySearchTerm\(q\)/, path);
    assert.match(page, /maxLength=\{120\}/, path);
    assert.doesNotMatch(page, /q\?\.trim\(\)/, path);
  }
  assert.match(read("app/admin/clientes/page.tsx"), /matchesClientDirectoryName\(/);
  assert.match(read("app/admin/clientes/page.tsx"), /Limpar filtros/);
});

test("private client detail rejects malformed IDs before authorized data access", () => {
  const page = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  assert.ok(page.indexOf("if (!isUuid(clienteId)) notFound()") < page.indexOf("getClientForPrivateFileAdministration(clienteId)"));
  assert.match(page, /listAccessibleClientFiles\(clienteId\)/);
  assert.match(page, /Aguardando liberação/);
});

test("private-file administration directory and exact client lookup use verified MFA session RLS", () => {
  const source = read("lib/files/private-file-admin.ts");
  const directory = source.match(/export async function listClientsForPrivateFileAdministration\(\)\s*\{([\s\S]*?)\n\}/)?.[1];
  const exact = source.match(/export async function getClientForPrivateFileAdministration\(clientId: string\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(directory && exact, "both admin private-file read boundaries exist");
  for (const body of [directory, exact]) {
    assert.ok(body.indexOf('await requireRole("admin")') < body.indexOf("await createClient()"), "MFA must precede session query");
    assert.match(body, /\.from\("clients"\)/);
    assert.doesNotMatch(body, /createAdminClient|service_role|client_assignments|ended_at/);
  }
  assert.match(directory, /collectPrivateFilePages/);
  assert.match(directory, /orderPrivateFileHistory/);
  assert.match(exact, /\.eq\("id", clientId\)/);
  assert.match(read("app/admin/clientes/[clienteId]/arquivos/page.tsx"), /listAccessibleClientFiles\(clienteId\)/);
});
