import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const write = read("lib/clients/registration-admin.ts");
const client = read("app/cliente/perfil/actions.ts");
const admin = read("app/admin/clientes/[clienteId]/actions.ts");

test("privileged registration write rejects stale updates atomically", () => {
  assert.match(write, /expectedUpdatedAt: string \| null/);
  assert.match(write, /\.eq\("client_id", input\.clientId\)/);
  assert.match(write, /\.eq\("updated_at", input\.expectedUpdatedAt\)/);
  assert.match(write, /\.maybeSingle\(\)/);
  assert.match(write, /if \(!data\) throw new ClientRegistrationConflictError/);
  assert.doesNotMatch(write, /\.upsert\(/);
});

test("creating registration never replaces a record created by another actor", () => {
  assert.match(write, /\.insert\(\{ client_id: input\.clientId, \.\.\.values \}\)/);
  assert.match(write, /error\?\.code === "23505"/);
  assert.match(write, /ClientRegistrationConflictError/);
});

test("both roles validate scope before privileged version-checked write", () => {
  assert.match(client, /requireRole\("client"\)/);
  assert.match(client, /getCurrentClient\(\)/);
  assert.match(admin, /requireRole\("admin"\)/);
  assert.match(admin, /getAccessibleClient\(clientId\)/);
  for (const source of [client, admin]) {
    assert.match(source, /formData\.get\("expectedUpdatedAt"\)/);
    assert.match(source, /expectedUpdatedAt: expectedRaw \|\| null/);
    assert.match(source, /error instanceof ClientRegistrationConflictError/);
    assert.match(source, /Atualize a página e confira os dados/);
  }
});

test("client and professional editors preserve exact server version and allow explicit conflict review", () => {
 const shared=read("components/client/ClientRegistrationEditor.tsx");
 for (const marker of ['name="expectedUpdatedAt"','value={baselineVersion??""}',"state.current","reviewServer","Descartar meu rascunho e usar dados atuais","router.refresh()"])assert.ok(shared.includes(marker),marker);
 for(const file of ["components/client/ClientRegistrationEditForm.tsx","components/admin/AdminClientRegistrationEditForm.tsx"])assert.ok(read(file).includes("ClientRegistrationEditor"));
 for(const page of ["app/cliente/perfil/page.tsx","app/admin/clientes/[clienteId]/page.tsx"])assert.match(read(page), /updatedAt=\{registration\?\.updated_at \?\? null\}/);
});

test("contact details are not confused with authentication identity or anamnesis", () => {
  assert.doesNotMatch(write, /auth\.admin|auth\.users/);
  assert.doesNotMatch(client, /updateUserById/);
  assert.doesNotMatch(admin, /auth\.admin\.updateUserById/);
});
