import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("only one method is mounted and both options are explicit",()=>{
 const chooser=read("components/admin/ClientInvitationMethodChooser.tsx");
 const page=read("app/admin/clientes/nova/page.tsx");
 assert.match(page, /<ClientInvitationMethodChooser/);
 assert.doesNotMatch(page, /<ClientInviteForm|<ManualClientInviteForm/);
 assert.match(chooser, /method === "manual"/);
 assert.match(chooser, /<ManualClientInviteForm/);
 assert.match(chooser, /<ClientInviteForm/);
 assert.match(chooser, /fieldset disabled=\{attempted\}/);
 assert.match(chooser, /setAttempted\(true\)/);
 assert.match(chooser, /não comprova entrega do email/);
});
test("both invitation forms lock the chooser after one actual submit",()=>{
 for(const p of ["components/admin/ClientInviteForm.tsx","components/admin/ManualClientInviteForm.tsx"]){
  const s=read(p);
  assert.match(s, /onProvisioningAttempt\?\.\(\)/);
  assert.match(s, /inFlightRef.current = true/);
  assert.match(s, /event.preventDefault\(\)/);
  assert.match(s, /aria-busy=\{isPending\}/);
 }
});
test("sensitive links and identity reconciliation remain server-owned",()=>{
 const actions=read("app/admin/clientes/nova/actions.ts");
 const chooser=read("components/admin/ClientInvitationMethodChooser.tsx");
 assert.match(actions,/resolveTrustedClientAccessOrigin\(\)/);
 assert.match(actions,/identity_reconciliation_required/);
 assert.doesNotMatch(chooser,/token_hash|createAdminClient|inviteUserByEmail|generateLink\(/);
});
