import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("a potentially committed training request is never reported as certainly absent",()=>{
 const client=read("app/cliente/treino/actions.ts");
 const admin=read("app/admin/clientes/[clienteId]/actions.ts");
 assert.match(client,/Não foi possível confirmar a solicitação/);
 assert.doesNotMatch(client,/Sua solicitação não foi registrada/);
 assert.match(admin,/Confira o histórico antes de repetir/);
});
test("both forms preserve text and let the user verify the exact existing history",()=>{
 const client=read("components/client/ClientTrainingRequestForm.tsx");
 const admin=read("components/admin/AdminTrainingRequestForm.tsx");
 const page=read("app/admin/clientes/[clienteId]/treino/page.tsx");
 assert.match(client,/href="#suas-solicitacoes"/);
 assert.match(admin,/href="#historico-solicitacoes-treino"/);
 assert.match(page,/id="historico-solicitacoes-treino"/);
 for(const s of [client,admin]){assert.match(s,/role="status"/);assert.match(s,/inFlightRef.current/);assert.match(s,/state.success/);}
});
