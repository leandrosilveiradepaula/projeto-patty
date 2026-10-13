import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read = (p:string) => readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const page=read("app/admin/clientes/[clienteId]/treino/page.tsx");
const overview=read("components/admin/AdminTrainingWorkflowOverview.tsx");
const css=read("app/admin/clientes/[clienteId]/treino/page.module.css");

test("professional workflow remains request -> compose -> review -> publish, never automatically",()=>{
 assert.match(overview,/Solicitação/);
 assert.match(overview,/Montagem/);
 assert.match(overview,/Revisão/);
 assert.match(overview,/Publicação/);
 assert.match(overview,/Nada é liberado automaticamente/);
 assert.match(page,/requests\.length === 0 \? "request"/);
 assert.match(page,/openVersion\.reviewed_at \? "publish" : sortedOpenItems\.length > 0 \? "review" : "compose"/);
 assert.match(page,/mode="review"/);
 assert.match(page,/mode="publish"/);
});
test("workflow links target the real sections and the current draft is the only editable version",()=>{
 for(const id of ["prescricao-treino","solicitacao-treino","conferencia-treino","publicar-treino","historico-versoes-treino"]) {
   assert.ok(page.includes('id="'+id+'"'),id);
 }
 assert.match(page,/!openVersion\.reviewed_at \?/);
 assert.match(page,/<details className=\{styles\.exerciseEditor\}>/);
 assert.match(page,/AdminTrainingPlanItemForm/);
 assert.match(page,/AdminTrainingPlanLifecycleAction/);
});
test("exercise editing uses accessible disclosure and mobile-first layout",()=>{
 assert.match(css,/\.exerciseEditor > summary:focus-visible/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
