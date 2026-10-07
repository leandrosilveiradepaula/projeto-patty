import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin assessments separate drafts from finalized history", () => {
  const page = read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");

  assert.match(page, /title="Em andamento"/);
  assert.match(page, /title="Histórico finalizado"/);
  assert.match(page, /Continuar avaliação/);
  assert.match(page, /draftAssessments\.map/);
  assert.match(page, /finalizedAssessments\.map/);
});
