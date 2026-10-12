import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("copy all is explicitly confirmed, scoped to the same plan, with a truly empty draft",()=>{
 const s=read("app/admin/clientes/[clienteId]/treino/actions.ts");
 const fn=s.slice(s.indexOf("export async function copyPublishedTrainingVersionItemsAction("));
 assert.match(fn,/requireAccessibleTrainingVersion\(clientId, draftVersionId\)/);
 assert.match(fn,/draft.reviewed_at \|\| draft.published_at/);
 assert.match(fn,/formData.getAll\("confirmCopyAll"\).length !== 1/);
 assert.match(fn,/listAccessibleClientTrainingPlanVersions\(plan.id\)/);
 assert.match(fn,/version.id === sourceVersionId && version.published_at !== null/);
 assert.match(fn,/currentItems.length !== 0/);
 assert.match(fn,/sourceItems.length === 0/);
 assert.match(fn,/publishedIds.has\(item.exercise_version_id\)/);
 assert.match(fn,/copyAccessiblePublishedTrainingPlanItems\(/);
 assert.doesNotMatch(fn,/publishAccessibleClientTrainingPlanVersion\(/);
});
test("copy all uses one insert statement, not an item loop with partial success",()=>{
 const s=read("lib/supabase/data-access.ts");
 const fn=s.slice(s.indexOf("export async function copyAccessiblePublishedTrainingPlanItems("),s.indexOf("export async function updateAccessibleClientTrainingPlanItem("));
 assert.match(fn,/\.insert\(input.items.map/);
 assert.match(fn,/training_plan_version_id: input.trainingPlanVersionId/);
 assert.match(fn,/if \(error\) throw error/);
 assert.doesNotMatch(fn,/Promise.all/);
});
test("UI does not offer copying a non-published version or altering reviewed draft",()=>{
 const page=read("app/admin/clientes/[clienteId]/treino/page.tsx");
 const form=read("components/admin/AdminTrainingCopyPublishedVersion.tsx");
 assert.match(page,/openVersion && !openVersion.reviewed_at && sortedOpenItems.length === 0/);
 assert.match(page,/publishedVersionId=\{version.id\}/);
 assert.match(form,/type="checkbox" name="confirmCopyAll" value="yes" required/);
 assert.match(form,/disabled=\{pending \|\| state.success\}/);
});
