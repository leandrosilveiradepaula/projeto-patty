import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("administrative feedback distinguishes client wait from professional review", () => {
 const page=read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
 assert.match(page,/ausência de resposta não exige revisão profissional imediata/);
 assert.match(page,/href="#solicitar-feedback"/);
 assert.match(page,/Respostas efetivamente enviadas pela cliente/);
});
test("administrative anamnesis distinguishes drafts from submitted answers", () => {
 const page=read("app/admin/clientes/[clienteId]/anamnese/page.tsx");
 assert.match(page,/Rascunhos iniciados pela cliente, ainda não enviados/);
 assert.match(page,/Somente Anamneses efetivamente enviadas/);
 assert.match(page,/respostas originais e a versão utilizada permanecem preservadas/);
});
