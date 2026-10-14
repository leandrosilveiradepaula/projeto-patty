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
