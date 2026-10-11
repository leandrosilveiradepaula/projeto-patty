import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const src=read("lib/supabase/data-access.ts");
function get(name:string){const a=src.indexOf("export async function "+name+"(");assert.ok(a>=0,name);const b=src.indexOf("\nexport async function ",a+25);return src.slice(a,b);}
test("individual event reads preserve client filters, full pagination and stable history",()=>{
for(const [name,filter] of [["listAccessibleClientLiquidIntakeEvents",'\.eq("client_id", clientId)'],["listAccessibleClientActivityCheckinEvents",'\.eq("client_id", clientId)']]){
 const fn=get(name);
 assert.match(fn,/createClient\(\)/);
 assert.ok(fn.includes(filter.replace("\\","")),name);
 assert.match(fn,/collectCheckinHistoryPages\(/);
 assert.match(fn,/\.range\(from, to\)/);
 assert.doesNotMatch(fn,/createAdminClient|service_role/);
}
assert.match(get("listAccessibleClientLiquidIntakeEvents"),/recordedFrom/);
assert.match(get("listAccessibleClientLiquidIntakeEvents"),/recordedBefore/);
assert.match(get("listAccessibleClientActivityCheckinEvents"),/checkinDate/);
});
test("both append-only correction histories batch authorized event IDs and preserve original values",()=>{
for(const n of ["listAccessibleClientLiquidIntakeEventCorrections","listAccessibleClientActivityCheckinEventCorrections"]){
const fn=get(n);
assert.match(fn,/collectCheckinCorrectionRows\(eventIds/);
assert.match(fn,/\.in\("event_id", ids\)/);
assert.match(fn,/\.range\(from, to\)/);
assert.match(fn,/newestFirstByInstant\(rows/);
assert.doesNotMatch(fn,/createAdminClient|\.update\(/);
}
});
test("client and Patty still display effective latest corrections and do not create hydration targets",()=>{
for(const p of ["app/cliente/checkins/page.tsx","app/admin/clientes/[clienteId]/checkins/page.tsx"]){
const text=read(p);
assert.match(text,/latestCheckinCorrectionsByEvent\(liquidCorrections\)/);
assert.match(text,/latestCheckinCorrectionsByEvent\(activityCorrections\)/);
assert.doesNotMatch(text,/35 \*|60 \*|0\.7 \*/);
}
});
