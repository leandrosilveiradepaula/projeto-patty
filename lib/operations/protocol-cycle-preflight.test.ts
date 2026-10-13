import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const actions=readFileSync(new URL("../../app/admin/protocolos/[protocoloId]/actions.ts",import.meta.url),"utf8");
const access=readFileSync(new URL("../supabase/data-access.ts",import.meta.url),"utf8");
test("the professional may not create an unusable cycle before checking its atomic editor",()=>{
 const start=actions.indexOf("export async function addProtocolMealPlanCycle(");
 const end=actions.indexOf("export async function editProtocolMealPlanCycle(",start);
 assert.ok(start>=0 && end>start);
 const fragment=actions.slice(start,end);
 assert.ok(fragment.indexOf("probeDraftCycleWriter()")>fragment.indexOf('requireRole("admin")'));
 assert.ok(fragment.indexOf("writerStatus !== \"available\"")<fragment.indexOf("createAccessibleMealPlanCycle("));
 assert.ok(fragment.includes("Nenhum ciclo foi criado"));
 assert.ok(access.includes('const nonexistentId = "00000000-0000-4000-8000-000000000000"'));
});
