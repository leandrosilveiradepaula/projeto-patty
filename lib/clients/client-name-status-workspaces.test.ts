import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const workspacePages = [
  "app/admin/clientes/[clienteId]/protocolos/page.tsx",
  "app/admin/clientes/[clienteId]/treino/page.tsx",
  "app/admin/clientes/[clienteId]/avaliacoes/page.tsx",
  "app/admin/clientes/[clienteId]/arquivos/page.tsx",
  "app/admin/clientes/[clienteId]/anamnese/page.tsx",
  "app/admin/clientes/[clienteId]/feedback-semanal/page.tsx",
  "app/admin/clientes/[clienteId]/checkins/page.tsx",
];

test("admin client workspaces prefer the canonical client full_name", () => {
  for (const relativePath of workspacePages) {
    const source = read(relativePath);
    assert.match(
      source,
      /client\.full_name/,
      relativePath + " must use clients.full_name",
    );
  }
});

test("client list and detail use clients.status for active/inactive presentation", () => {
  const list = read("app/admin/clientes/page.tsx");
  const detail = read("app/admin/clientes/[clienteId]/page.tsx");

  assert.match(list, /client\.status === "inactive"/);
  assert.match(detail, /client\.status === "active"/);
  assert.match(detail, />Inativa</);
});
