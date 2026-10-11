import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const access=read("lib/supabase/data-access.ts");
function fn(name:string){const a=access.indexOf("export async function "+name+"(");assert.ok(a>=0);const b=access.indexOf("\nexport async function ",a+25);return access.slice(a,b);}
test("client and professional histories remain authenticated, scoped and complete",()=>{
 for(const name of ["listCurrentClientFiles","listAccessibleClientFiles"]){
   const s=fn(name);assert.match(s,/createClient\(\)/);
   assert.match(s,/\.eq\("client_id", clientId\)/);
   assert.match(s,/collectPrivateFilePages\(/);
   assert.match(s,/\.range\(from, to\)/);
   assert.match(s,/orderPrivateFileHistory\(rows\)/);
   assert.doesNotMatch(s,/createAdminClient|service_role/);
 }
});
test("Patty-only directory remains server-only and complete",()=>{
 const source=read("lib/files/private-file-admin.ts");
 assert.match(source,/import "server-only"/);
 assert.match(source,/listClientsForPrivateFileAdministration/);
 assert.match(source,/collectPrivateFilePages\(/);
 assert.match(source,/\.range\(from, to\)/);
 assert.match(source,/orderPrivateFileHistory\(rows\)/);
 const page=read("app/admin/arquivos/page.tsx");
 assert.match(page,/listClientsForPrivateFileAdministration\(\)/);
});
test("no browser page leaks paths or bypasses release",()=>{
 const client=read("app/cliente/arquivos/page.tsx");
 const admin=read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
 for(const p of [client,admin]){
  assert.doesNotMatch(p,/object_path|service_role/);
  assert.match(p,/file\.id/);
 }
 assert.match(admin,/pendingReleaseFiles/);
 assert.match(admin,/AdminPrivateFileReleaseForm/);
});
