import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p: string) => readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("draft update checks persisted original title and notes", () => {
 const s=read("lib/supabase/data-access.ts"); const a=read("app/admin/clientes/[clienteId]/treino/actions.ts");
 assert.match(s,/\.eq\("title", input.expectedTitle\)/);
 assert.match(s,/query\.is\("notes", null\)/);
 assert.match(s,/query\.eq\("notes", input.expectedNotes\)/);
 assert.match(a,/expectedTitle = requiredText/);
 assert.match(a,/expectedNotes = optionalText/);
});
test("item mutation checks original exercise and core prescription fields",()=>{
 const s=read("lib/supabase/data-access.ts");const f=read("components/admin/AdminTrainingPlanItemForm.tsx");
 for(const name of ["expectedExerciseName","expectedSetsText","expectedRepetitionsText"])assert.ok(s.includes(name),name);
 for(const col of ["exercise_name","sets_text","repetitions_text"])assert.ok(s.includes('.eq("'+col+'", input.expected'),col);
 assert.match(f,/name="expectedExerciseName"/);
});
test("forms preserve values after failure and keep human publication",()=>{
 const d=read("components/admin/AdminTrainingPlanDraftForm.tsx");const i=read("components/admin/AdminTrainingPlanItemForm.tsx");const p=read("app/admin/clientes/[clienteId]/treino/page.tsx");
 assert.match(d,/name="expectedTitle"/); assert.match(d,/name="expectedNotes"/);
 assert.match(i,/name="expectedSetsText"/);assert.match(i,/inFlightRef.current \|\| isPending/);
 assert.match(p,/if \(!\/\^\[0-9a-f\]/);
 assert.match(p,/mode="review"/);assert.match(p,/mode="publish"/);
});
