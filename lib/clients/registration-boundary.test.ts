import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("Cadastro Atual privileged persistence remains server-only", () => {
  const persistence = read("lib/clients/registration-admin.ts");

  assert.match(persistence, /^import "server-only";/m);
  assert.match(persistence, /createAdminClient\(\)/);
  assert.match(persistence, /\.from\("client_registration"\)/);
  assert.doesNotMatch(persistence, /auth\.admin\.updateUserById/);
  assert.doesNotMatch(persistence, /contact_email.*auth\.users/i);
});

test("Cadastro Atual actions resolve identity and client scope before privileged write", () => {
  const clientAction = read("app/cliente/perfil/actions.ts");
  const adminAction = read("app/admin/clientes/[clienteId]/actions.ts");

  assert.match(clientAction, /requireRole\("client"\)/);
  assert.match(clientAction, /getCurrentClient\(\)/);
  assert.match(clientAction, /upsertClientRegistrationPrivileged/);

  assert.match(adminAction, /requireRole\("admin"\)/);
  assert.match(adminAction, /getAccessibleClient\(clientId\)/);
  assert.match(adminAction, /upsertClientRegistrationPrivileged/);
});

test("Cadastro Atual edit forms keep login identity and Anamnesis history separate", () => {
  const clientForm = read("components/client/ClientRegistrationEditForm.tsx");
  const adminForm = read("components/admin/AdminClientRegistrationEditForm.tsx");

  assert.match(clientForm, /Cadastro Atual/);
  assert.match(clientForm, /não modifica[\s\S]*Anamnese/i);
  assert.match(clientForm, /nem o email usado para entrar na conta/i);

  assert.match(adminForm, /Cadastro Atual/);
  assert.match(adminForm, /Anamneses históricas/i);
  assert.match(adminForm, /não altera o email de login/i);
});
