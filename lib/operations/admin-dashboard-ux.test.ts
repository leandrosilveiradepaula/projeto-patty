import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin dashboard exposes all operational pending groups", () => {
  const page = read("app/admin/page.tsx");

  assert.match(page, /Ação profissional/);
  assert.match(page, /Aguardando cliente/);
  assert.match(page, /Operacional do sistema/);
  assert.match(page, /Próximas ações profissionais/);
  assert.match(page, /slice\(0, 3\)/);
  assert.match(page, /A ordem é cronológica e não representa prioridade clínica/);
});

test("admin dashboard pending preview links to record and client context", () => {
  const page = read("app/admin/page.tsx");

  for (const group of ["patty", "client", "operational"]) {
    assert.ok(page.includes("withPendingQueueReturn(item.href, pendingQueueLinks." + group + ")"),group);
    assert.ok(page.includes("withPendingQueueReturn(`/admin/clientes/${item.clientId}`, pendingQueueLinks." + group + ")"),group);
  }
  assert.match(page, /Ver todas as ações profissionais/);
});
