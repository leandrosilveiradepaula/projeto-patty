import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = p => readFileSync(new URL("../../"+p, import.meta.url),"utf8");
test("client filters distinguish Patty action from name search",()=>{
 const page=read("app/admin/clientes/page.tsx");
 assert.match(page,/Nenhuma cliente em acompanhamento possui ação da Patty nesta fila/);
 assert.match(page,/Nenhuma cliente com ação da Patty corresponde à busca/);
 assert.match(page,/Este filtro não inclui itens aguardando resposta da cliente/);
});
test("operational queue copy does not call pending records clinical priority",()=>{
 const page=read("app/admin/pendencias/page.tsx");
 assert.match(page,/Estar na fila não significa prioridade clínica/);
 assert.match(page,/Nenhuma ação da Patty, espera de cliente ou pendência operacional/);
});
