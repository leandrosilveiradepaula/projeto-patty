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

test("Corpo & Mente is the institutional identity of the professional workspace", () => {
  const dashboard = read("app/admin/page.tsx");
  const layout = read("app/admin/layout.tsx");
  const sidebar = read("components/layout/AdminSidebar.tsx");
  const queue = read("app/admin/pendencias/page.tsx");
  const pager = read("components/admin/PendingQueuePager.tsx");

  assert.match(dashboard, /title="Painel administrativo"/);
  assert.doesNotMatch(dashboard, /Painel de.*profile\.display_name/);
  assert.doesNotMatch(layout, /displayName=\{profile\?\.display_name\}/);
  assert.match(sidebar, /Corpo &amp; Mente/);
  assert.match(sidebar, /Área profissional/);
  assert.match(queue, /<option value="patty">Ações profissionais<\/option>/);
  assert.match(pager, /patty:"Ações profissionais"/);
  // Technical group values and anchors remain stable for existing deep links.
  assert.match(queue, /value="patty"/);
  assert.match(pager, /"acao-da-patty"/);
});
