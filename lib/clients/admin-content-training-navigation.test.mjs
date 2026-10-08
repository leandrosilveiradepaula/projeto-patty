import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("content release empty states link to the actual admin library", () => {
 const page = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
 assert.match(page,/href="\/admin\/conteudos"/);
 assert.match(page,/liberação é individual e não ocorre automaticamente/);
 assert.match(page,/arquivo privado verificado/);
});
test("training request empty states link to the existing form", () => {
 const page = read("app/admin/clientes/[clienteId]/treino/page.tsx");
 assert.match(page,/id="solicitacao-treino"/);
 assert.match(page,/href="#solicitacao-treino"/);
 assert.match(page,/O sistema não cria prescrição sem esse pedido/);
});
