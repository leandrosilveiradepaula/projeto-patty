import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("linked and unlinked names use atomic original-value checks",()=>{
 const s=read("lib/clients/client-profile-admin.ts"); const a=read("app/admin/clientes/[clienteId]/actions.ts");
 for(const v of ['.eq("full_name", input.expectedFullName)','.is("profile_id", null)','ClientNameConflictError','input.expectedDisplayName'])assert.ok(s.includes(v),v);
 for(const v of ['expectedCanonicalName','expectedProfileName','ClientNameConflictError','getAccessibleClient(clientId)'])assert.ok(a.includes(v),v);
});
test("canonical name form carries separate profile and professional values",()=>{
 const s=read("components/admin/AdminClientNameEditForm.tsx");
 for(const v of ['name="expectedCanonicalName"','name="expectedProfileName"','Recarregar nome atual'])assert.ok(s.includes(v),v);
});
test("invites, recovery and registration show busy states",()=>{
 for(const p of ["components/admin/ClientInviteForm.tsx","components/admin/ManualClientInviteForm.tsx","components/admin/AdminClientRecoveryLinkForm.tsx"]){
  const s=read(p);assert.match(s,/role="status"/);assert.match(s,/aria-busy=\{isPending\}/);
 }
 const editor=read("components/client/ClientRegistrationEditor.tsx");
 assert.match(editor,/role="status"/);
 assert.match(editor,/aria-busy=\{pending\}/);
});
