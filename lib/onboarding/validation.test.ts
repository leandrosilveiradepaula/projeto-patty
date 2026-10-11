import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeInvitationEmail,
  validateActivationPassword,
  validateClientDisplayName,
  validateInvitationEmail,
} from "./validation.ts";

test("normalizes surrounding whitespace without changing the address", () => {
  assert.equal(
    normalizeInvitationEmail("  Cliente.Exemplo+tag@example.com  "),
    "Cliente.Exemplo+tag@example.com",
  );
});

test("rejects missing or malformed invitation email", () => {
  assert.equal(validateInvitationEmail("").ok, false);
  assert.equal(validateInvitationEmail("cliente").ok, false);
  assert.equal(validateInvitationEmail("cliente@example").ok, false);
});

test("accepts a plausible invitation email", () => {
  assert.deepEqual(validateInvitationEmail("cliente@example.com"), { ok: true });
});

test("requires at least eight password characters", () => {
  assert.equal(validateActivationPassword("1234567", "1234567").ok, false);
});

test("requires password confirmation to match", () => {
  assert.equal(
    validateActivationPassword("senha-segura", "senha-diferente").ok,
    false,
  );
});

test("accepts matching activation passwords", () => {
  assert.deepEqual(
    validateActivationPassword("senha-segura", "senha-segura"),
    { ok: true },
  );
});


test("rejects missing or invalid client display name", () => {
  assert.equal(validateClientDisplayName("").ok, false);
  assert.equal(validateClientDisplayName(" ").ok, false);
  assert.equal(validateClientDisplayName("A").ok, false);
  assert.equal(validateClientDisplayName("A".repeat(121)).ok, false);
});

test("accepts a valid client display name", () => {
  assert.deepEqual(validateClientDisplayName("  Maria da Silva  "), { ok: true });
});


import { confirmedNewClientInvitation, parseInvitationFormFields, validateInvitationDraft } from "./validation.ts";

test("browser and server use the same normalization for identity input", () => {
  assert.deepEqual(validateInvitationDraft({displayName:"  Ana Exemplo  ",email:"  ana@example.com  "}),{
    ok:true,value:{displayName:"Ana Exemplo",email:"ana@example.com"},
  });
});

test("invalid name and email return field-scoped errors before Auth side effects", () => {
  assert.deepEqual(validateInvitationDraft({displayName:" ",email:"invalido"}),{
    ok:false,field:"displayName",message:"Informe o nome da cliente.",
  });
  assert.equal(validateInvitationDraft({displayName:"Ana Exemplo",email:"invalido"}).ok,false);
});

test("ambiguous or file-valued identity inputs are rejected", () => {
  for(const key of ["displayName","email"] as const) {
    const value=new FormData();
    value.set("displayName","Ana Exemplo");
    value.set("email","ana@example.com");
    value.append(key,"segundo-valor");
    const parsed=parseInvitationFormFields(value);
    assert.equal(parsed.ok,false);
    if(!parsed.ok)assert.equal(parsed.field,key);

    const upload=new FormData();
    upload.set("displayName","Ana Exemplo");
    upload.set("email","ana@example.com");
    upload.set(key,new Blob(["x"]),"file.txt");
    const bad=parseInvitationFormFields(upload);
    assert.equal(bad.ok,false);
  }
});

test("server requires an unambiguous explicit new identity confirmation", () => {
  const f=new FormData();
  assert.equal(confirmedNewClientInvitation(f),false);
  f.set("confirmNewClient","yes");
  assert.equal(confirmedNewClientInvitation(f),true);
  f.append("confirmNewClient","yes");
  assert.equal(confirmedNewClientInvitation(f),false);
  f.set("confirmNewClient","no");
  assert.equal(confirmedNewClientInvitation(f),false);
});
