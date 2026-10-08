import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

test("assessment detail uses canonical client name and configured finalization rules",()=>{
 const page=read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
 assert.match(page,/assessment\.clients\?\.full_name\?\.trim\(\)/);
 assert.match(page,/canFinalize=\{finalizationReadiness\?\.canFinalizeDeterministically \?\? false\}/);
 assert.match(page,/configuração profissional ativa/);
 assert.doesNotMatch(page,/A Básica exige peso, cintura/);
});
test("assessment finalization button follows the deterministic server readiness",()=>{
 const form=read("components/admin/AssessmentDraftForms.tsx");
 assert.match(form,/disabled=\{!canFinalize\}/);
 assert.match(form,/todos os itens obrigatórios acima/);
});
test("assessment photo workflow links to the existing private file workspace",()=>{
 const page=read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
 assert.match(page,/availablePhotos\.length === 0/);
 assert.match(page,/\/arquivos\`\}/);
});
