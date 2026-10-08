import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
test("admin checkins distinguish activity date and record timestamp", () => {
 const page=read("app/admin/clientes/[clienteId]/checkins/page.tsx");
 assert.match(page,/Dia da atividade:/);
 assert.match(page,/Resposta registrada em/);
 assert.match(page,/Até 30 registros recentes de atividade/);
 assert.match(page,/correções preservam o original/);
});
test("admin assessment history distinguishes drafts from finalized records", () => {
 const page=read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");
 assert.match(page,/Criar outra avaliação não conclui a anterior/);
 assert.match(page,/Rascunhos permanecem em Em andamento/);
 assert.match(page,/Retome o rascunho acima/);
});
