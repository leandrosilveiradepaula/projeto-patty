import assert from "node:assert/strict";
import test from "node:test";
import { describeAdminFeedbackReminder } from "./admin-feedback-reminder.ts";

test("missing channel navigates to feedback preference", () => {
 const result=describeAdminFeedbackReminder({delivery_state:"blocked_no_channel",channel_key:null});
 assert.equal(result?.nextStep?.anchor,"preferencia-feedback");
});
test("missing recipient contact navigates to Cadastro Atual",()=>{
 for(const channel of ["email","whatsapp"]){
  const result=describeAdminFeedbackReminder({delivery_state:"blocked_missing_contact",channel_key:channel});
  assert.equal(result?.nextStep?.anchor,"cadastro-atual");
 }
});
test("SMTP acceptance is not represented as confirmed receipt",()=>{
 const result=describeAdminFeedbackReminder({delivery_state:"delivered",channel_key:"email"});
 assert.match(result?.label??"",/recebimento do email não confirmado/);
 assert.equal(result?.nextStep,undefined);
});
test("failed email and queued email are not mislabeled as delivered",()=>{
 assert.match(describeAdminFeedbackReminder({delivery_state:"delivery_failed",channel_key:"email"})?.label??"",/Falha/);
 assert.match(describeAdminFeedbackReminder({delivery_state:"queued_external",channel_key:"email"})?.label??"",/aguardando/);
});
