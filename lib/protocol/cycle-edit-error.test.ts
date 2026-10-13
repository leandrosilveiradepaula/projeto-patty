import assert from "node:assert/strict";
import test from "node:test";
import { protocolCycleEditFailureMessage, draftCycleWriterReadiness } from "./cycle-edit-error.ts";

test("missing remote function is identified without suggesting stale edits", () => {
  for (const code of ["PGRST202", "42883"]) {
    const text = protocolCycleEditFailureMessage({ code });
    assert.match(text, /função necessária ainda não está instalada/);
    assert.match(text, /Nenhuma alteração foi gravada/);
    assert.doesNotMatch(text, /outra sessão/);
  }
});
test("concurrent changes and reviewed versions get distinct actionable explanations", () => {
  assert.match(protocolCycleEditFailureMessage({ code: "P0001" }), /outra sessão/);
  assert.match(protocolCycleEditFailureMessage({ code: "55000" }), /revisão/);
});
test("other errors do not disclose raw server details or claim a successful write", () => {
  assert.doesNotMatch(protocolCycleEditFailureMessage({code:"XX000", message:"sensitive internal database details"}), /sensitive|XX000/);
  assert.match(protocolCycleEditFailureMessage(null), /Nenhuma gravação foi confirmada/);
});

test("cycle creation readiness only accepts proof that the authenticated RPC executed", () => {
  assert.equal(draftCycleWriterReadiness({code:"P0002"}), "available");
  for (const code of ["PGRST202","42883"]) assert.equal(draftCycleWriterReadiness({code}), "missing");
  for (const bad of [null,undefined,{}, {code:"42501"},{code:"P0001"},{code:"55000"}]) assert.equal(draftCycleWriterReadiness(bad), "unverified");
});
