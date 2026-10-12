import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("copy action is scoped to same client plan, published source, and editable draft",()=>{
 const s=read("app/admin/clientes/[clienteId]/treino/actions.ts");
 const fragment=s.slice(s.indexOf("export async function copyPublishedTrainingItemAction("));
 assert.match(fragment,/requireAccessibleTrainingVersion\(clientId, draftVersionId\)/);
 assert.match(fragment,/draft.reviewed_at \|\| draft.published_at/);
 assert.match(fragment,/listAccessibleClientTrainingPlanVersions\(plan.id\)/);
 assert.match(fragment,/v.id === publishedVersionId && v.published_at !== null/);
 assert.match(fragment,/listAccessibleClientTrainingPlanItems\(sourceVersion.id\)/);
 assert.match(fragment,/sourceItems.find\(\(item\) => item.id === sourceItemId\)/);
 assert.match(fragment,/createAccessibleClientTrainingPlanItem\(/);
 assert.doesNotMatch(fragment,/publishAccessibleClientTrainingPlanVersion\(/);
 assert.doesNotMatch(fragment,/service_role|createAdminClient/);
});
test("only published exact exercise references are eligible for reuse",()=>{
 const s=read("app/admin/clientes/[clienteId]/treino/actions.ts");
 const part=s.slice(s.indexOf("export async function copyPublishedTrainingItemAction("));
 assert.match(part,/exercise.id === source.exercise_version_id && exercise.published_at !== null/);
 assert.match(part,/exerciseVersionId: source.exercise_version_id/);
 assert.match(part,/setsText: source.sets_text/);
 assert.match(part,/executionNotes: source.execution_notes/);
});
test("source history remains immutable and requires human action in draft",()=>{
 const p=read("app/admin/clientes/[clienteId]/treino/page.tsx");
 const control=read("components/admin/AdminTrainingPublishedItemCopy.tsx");
 assert.match(p,/openVersion && !openVersion.reviewed_at/);
 assert.match(p,/publishedVersionId=\{version.id\}/);
 assert.match(p,/sourceItemId=\{item.id\}/);
 assert.match(control,/copyPublishedTrainingItemAction/);
 assert.match(control,/disabled=\{pending \|\| state.success\}/);
 assert.match(control,/confirmCopy/);
});
