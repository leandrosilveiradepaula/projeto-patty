import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const access=read("lib/supabase/data-access.ts");
function section(name:string){const a=access.indexOf("export async function "+name+"(");assert.ok(a>=0,name);const b=access.indexOf("\nexport async function ",a+25);return access.slice(a,b);}
test("administrative protocol directory exhausts authorized catalog",()=>{
 const src=section("listAccessibleProtocols");
 assert.match(src,/createClient\(\)/);
 assert.match(src,/collectProtocolCatalogPages\(/);
 assert.match(src,/\.range\(from, to\)/);
 assert.match(src,/clients\(id, full_name, profiles\(display_name\)\)/);
 assert.doesNotMatch(src,/createAdminClient|service_role/);
});
test("client protocol directory maintains exact client scope and all versioned entries",()=>{
 const src=section("listAccessibleProtocolsForClient");
 assert.match(src,/collectPublishedProtocolRows\(\[clientId\]/);
 assert.match(src,/\.in\("client_id", ids\)/);
 assert.match(src,/\.range\(from, to\)/);
 assert.match(src,/Date\.parse\(left\.created_at\)/);
 assert.match(src,/left\.id\.localeCompare\(right\.id\)/);
 assert.doesNotMatch(src,/createAdminClient/);
});
test("human publication and cloning reject repeated pending submits",()=>{
 for(const path of ["components/admin/ProtocolLifecycleAction.tsx","components/admin/ProtocolCloneVersionAction.tsx"]){
  const src=read(path);
  assert.match(src,/useRef\(false\)/);
  assert.match(src,/inFlightRef\.current \|\| isPending \|\| state\.success/);
  assert.match(src,/event\.preventDefault\(\)/);
  assert.match(src,/inFlightRef\.current = true/);
  assert.match(src,/disabled=\{isPending \|\| state\.success\}/);
  assert.match(src,/aria-busy=\{isPending\}/);
 }
 const lifecycle=read("components/admin/ProtocolLifecycleAction.tsx");
 assert.match(lifecycle,/confirmationName/);
 assert.match(lifecycle,/name=\{content\.confirmationName\}/);
 const client=read("app/cliente/protocolo/page.tsx");
 assert.doesNotMatch(client,/ProtocolLifecycleAction|ProtocolCloneVersionAction/);
});
