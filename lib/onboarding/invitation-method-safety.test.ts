import assert from "node:assert/strict";
import test from "node:test";
import { mayChangeInvitationMethodAfterFailure } from "./invitation-method-safety.ts";

test("only explicit pre-provisioning failures permit switching invitation methods",()=>{
 assert.equal(mayChangeInvitationMethodAfterFailure({message:"Corrija o email.",retryable:true}),true);
 assert.equal(mayChangeInvitationMethodAfterFailure({message:"Origin segura indisponível.",retryable:true,success:false}),true);
 for(const outcome of [
  {message:null},{message:"Confirme o vínculo"},
  {message:"Falha após criar identidade",retryable:false},
  {message:"Link criado",success:true,retryable:true},
 ]) assert.equal(mayChangeInvitationMethodAfterFailure(outcome),false);
});

test("ambiguous provisioning errors never unlock a second Auth creation path",()=>{
 const possibleOrphan={message:"Identidade já pode existir",success:false};
 assert.equal(mayChangeInvitationMethodAfterFailure(possibleOrphan),false);
 const compensationFailure={message:"Compensação falhou",success:false,retryable:false};
 assert.equal(mayChangeInvitationMethodAfterFailure(compensationFailure),false);
});

test("both invite paths use the same retry guard, without a second provisioning call",async()=>{
 const { readFileSync } = await import("node:fs");
 const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
 const chooser=read("components/admin/ClientInvitationMethodChooser.tsx");
 for(const p of ["components/admin/ClientInviteForm.tsx","components/admin/ManualClientInviteForm.tsx"]){
  const form=read(p);
  assert.match(form,/mayChangeInvitationMethodAfterFailure\(state\)/);
  assert.match(form,/onSafeRetryAllowed\?\.\(\)/);
  assert.match(form,/onProvisioningAttempt\?\.\(\)/);
 }
 assert.match(chooser,/unlockSafeRetry = useCallback\(\(\) => setAttempted\(false\)/);
 assert.equal(chooser.split("onSafeRetryAllowed={unlockSafeRetry}").length-1,2);
});
