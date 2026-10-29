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
  assert.match(page, /draftPagination\.items\.map/);
  assert.match(page, /historyPagination\.items\.map/);
});


test("J3 puts active assessment work before creation, and comparison only after the history", () => {
 const page = read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");
 const steps = ['title="Localizar avaliações"', 'title="Em andamento"', 'title="Nova avaliação"', 'title="Histórico finalizado"', 'title="Comparação histórica"', 'title="Próximos passos"'];
 const positions = steps.map(step => page.indexOf(step));
 assert.ok(positions.every(position => position >= 0), "all work stages are present");
 assert.deepEqual(positions, [...positions].sort((a,b) => a-b), "sequence must follow the real workflow");
 assert.match(page, /draftAssessments\.length > 0 \? <Section/);
 assert.match(page, /draftAssessments\.length > 0 \? <Link href="#avaliacoes-em-andamento">/);
});
