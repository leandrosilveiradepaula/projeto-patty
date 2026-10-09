import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("ending follow-up explains inactive status and preserves history", () => {
  const form = read("components/admin/AdminEndClientAssignmentForm.tsx");
  const list = read("app/admin/clientes/page.tsx");

  assert.match(form, /será marcada como inativa/);
  assert.match(form, /Histórico, avaliações, protocolos, treinos, arquivos/);
  assert.match(form, /A conta da cliente e seus dados não serão excluídos/);
  assert.match(form, /Encerrar e marcar como inativa/);
  assert.match(form, /disabled=\{!confirmed \|\| isSubmitting\}/);
  assert.match(list, /A cliente agora está inativa/);
});

test("ending follow-up still uses the protected assignment action", () => {
  const form = read("components/admin/AdminEndClientAssignmentForm.tsx");
  const action = read("app/admin/clientes/[clienteId]/actions.ts");

  assert.match(form, /endClientAssignmentAction\.bind\(null, clientId\)/);
  assert.match(action, /endCurrentAdminClientAssignments/);
  assert.match(action, /confirmEndAssignment/);
});
