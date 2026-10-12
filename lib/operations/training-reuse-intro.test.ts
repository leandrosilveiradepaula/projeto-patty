import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("published title and notes are copied to draft form only after explicit request",()=>{
 const page=read("app/admin/clientes/[clienteId]/treino/page.tsx");
 assert.match(page,/reutilizarPublicado\?: string/);
 assert.match(page,/search.reutilizarPublicado === "sim"/);
 assert.match(page,/latestPublished\.title : undefined/);
 assert.match(page,/latestPublished\.notes : undefined/);
 assert.match(page,/Preencher com título e observações publicados/);
 assert.match(page,/Começar com campos em branco/);
 assert.match(page,/Nenhum exercício é copiado nesta etapa/);
 assert.doesNotMatch(page,/autopublish|autoPublish/);
});
test("new training plan remains user-edited and saved by the existing draft server action",()=>{
 const form=read("components/admin/AdminTrainingPlanDraftForm.tsx");
 assert.match(form,/createTrainingPlanDraftAction/);
 assert.match(form,/defaultValue=\{title\}/);
 assert.match(form,/defaultValue=\{notes \?\? undefined\}/);
 assert.match(form,/Salvar não publica o treino/);
 const action=read("app/admin/clientes/[clienteId]/treino/actions.ts");
 const begin=action.indexOf("export async function createTrainingPlanDraftAction(");
 const end=action.indexOf("export async function updateTrainingPlanDraftAction(",begin);
 const create=action.slice(begin,end);
 assert.match(create,/listAccessibleClientTrainingRequests/);
 assert.match(create,/createAccessibleClientTrainingPlanDraft/);
 assert.doesNotMatch(create,/publishAccessibleClientTrainingPlanVersion/);
});
