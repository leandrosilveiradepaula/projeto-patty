import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const source=read("lib/supabase/data-access.ts");
function func(name:string){const a=source.indexOf("export async function "+name+"(");assert.ok(a>=0,name);const b=source.indexOf("\nexport async function ",a+20);return source.slice(a,b);}
test("assigned-client directory remains RLS-scoped and complete",()=>{
 const s=func("listClientsAssignedToCurrentAdmin");
 for(const v of ['createClient()','collectAdminDirectoryPages(','.is("ended_at", null)','.range(from, to)','.order("client_id"']) assert.ok(s.includes(v),v);
 assert.doesNotMatch(s,/createAdminClient|service_role/);
});
test("assessment totals use complete authorized chronological rows",()=>{
 const s=func("listAccessibleClientAssessments");
 for(const v of ['createClient()','collectAdminDirectoryPages(','.range(from, to)','orderAdminRecords(rows']) assert.ok(s.includes(v),v);
 assert.doesNotMatch(s,/createAdminClient|service_role/);
});
test("global client directory stays complete while operational dashboard remains assignment-scoped",()=>{
 const dashboard=read("app/admin/page.tsx"),clients=read("app/admin/clientes/page.tsx"),pending=read("lib/operations/pending-data.ts");
 assert.match(dashboard,/listClientsAssignedToCurrentAdmin\(\)/);
 assert.match(dashboard,/listAccessibleClientAssessments\(\)/);
 assert.match(clients,/listClientsAssignedToCurrentAdmin\(\)/);
 assert.match(pending,/listClientsAssignedToCurrentAdmin\(\)/);
});
