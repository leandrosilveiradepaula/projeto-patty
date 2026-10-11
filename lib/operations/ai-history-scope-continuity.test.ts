import assert from "node:assert/strict";import { readFileSync } from "node:fs";import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("execution and output history are complete under the caller's RLS",()=>{
 const s=read("lib/supabase/data-access.ts");
 for(const name of ["listAccessibleAiAnamnesisExecutions","listAccessibleNonterminalAiExecutions","listAccessibleAiExecutionOutputs"]){
 const start=s.indexOf("export async function "+name+"("),end=s.indexOf("\nexport async function ",start+20),fn=s.slice(start,end);
 assert.ok(start>=0,name);assert.match(fn,/createClient\(\)/);assert.match(fn,/\.range\(from, to\)/);assert.doesNotMatch(fn,/createAdminClient|service_role/);
 }
});
test("finding action reads are bounded and complete without privileged reads",()=>{
 const s=read("lib/ai/finding-actions.ts"),a=s.slice(s.indexOf("export async function listAccessibleAiFindingActions("),s.indexOf("export async function recordAiFindingAction("));
 assert.match(a,/collectAiPagesForIds\(/);assert.match(a,/\.in\("execution_id", ids\)/);assert.match(a,/\.range\(from, to\)/);assert.doesNotMatch(a,/createFindingActionsAdminClient/);
});
test("all privileged actions verify the exact RLS-accessible submission and execution",()=>{
 const s=read("app/admin/anamneses/[anamneseId]/ia/actions.ts");
 assert.equal((s.match(/await requireExactAccessibleAiExecution\(/g)||[]).length,3);
 assert.match(s,/getAccessibleAnamnesisSubmission\(submissionId\)/);
 assert.match(s,/listAccessibleAiAnamnesisExecutions\(submission.id\)/);
 assert.match(s,/assertAiExecutionBelongsToSubmission\(/);
 assert.match(s,/requireRole\("admin"\)/);
});
