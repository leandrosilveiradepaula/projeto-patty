import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../components/admin/AdminProtocolDraftEditor.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../../app/admin/protocolos/[protocoloId]/actions.ts", import.meta.url), "utf8");
const names = [
  ["CreatePlanForm", "AddVariantForm"],
  ["AddVariantForm", "AddMealForm"],
  ["AddMealForm", "AddDoseForm"],
  ["AddDoseForm", "UpdateVariantForm"],
  ["UpdateVariantForm", "RemoveVariantForm"],
  ["RemoveVariantForm", "UpdateMealForm"],
  ["UpdateMealForm", "RemoveMealForm"],
  ["RemoveMealForm", "DoseRow"],
  ["DoseRow", "AdminProtocolDraftEditor"],
] as const;

function part(name: string, next: string) {
  const start = source.indexOf("function " + name + "(");
  const end = source.indexOf("function " + next + "(", start + 1);
  assert.ok(start >= 0 && end > start, name);
  return source.slice(start, end);
}

test("all thirteen real draft mutation forms block rapid duplicate submissions", () => {
  assert.equal((source.match(/onSubmit=\{(?:submitGuard|updateSubmitGuard|removeSubmitGuard)\}/g) ?? []).length, 13);
  assert.match(source, /inFlightRef\.current \|\| pending/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /inFlightRef\.current = true/);
  assert.match(source, /inFlightRef\.current = false/);
  assert.match(source, /\[state, sharedLock\]/);
  for (const [name, next] of names) {
    const p = part(name, next);
    assert.match(p, /useProtocolDraftSubmitGuard\(/, name);
  }
});

test("edit and remove of the same dose cannot be issued in parallel from one row", () => {
  const row = part("DoseRow", "AdminProtocolDraftEditor");
  assert.match(row, /doseMutationLock = useRef\(false\)/);
  assert.match(row, /updateSubmitGuard/);
  assert.match(row, /removeSubmitGuard/);
  assert.equal((row.match(/sharedLock: doseMutationLock/g) ?? []).length, 2);
  assert.match(row, /disabled=\{updatePending \|\| removePending\}/);
  assert.match(row, /disabled=\{updatePending \|\| removePending \|\| removeState\.success\}/);
  assert.match(row, /blockAfterSuccess: true/);
});

test("draft forms disable editing while pending and never clear an unsuccessful addition", () => {
  for (const [name, next] of names) {
    const p = part(name, next);
    assert.match(p, /aria-busy=\{(?:pending|updatePending \|\| removePending)\}/, name);
    assert.match(p, /usePersistedProtocolRefresh/, name);
  }
  const variants = part("AddVariantForm", "AddMealForm");
  const meals = part("AddMealForm", "AddDoseForm");
  const doses = part("AddDoseForm", "UpdateVariantForm");
  for (const s of [variants, meals, doses]) {
    assert.match(s, /disabled=\{pending\}/);
    assert.match(s, /usePersistedProtocolRefresh\(state, formRef\)/);
  }
  assert.match(doses, /<select disabled=\{pending\} name="doseType" required>/);
  assert.match(source, /if \(state\.success\) \{/);
  assert.match(source, /formRef\?\.current\?\.reset\(\)/);
});

test("destructive operations still require explicit confirmation and stop after success", () => {
  for (const [name, next] of [
    ["RemoveVariantForm", "UpdateMealForm"],
    ["RemoveMealForm", "DoseRow"],
  ]) {
    const p = part(name, next);
    assert.match(p, /blockAfterSuccess: true/);
    assert.match(p, /setConfirmRemoval\(true\)/);
    assert.match(p, /setConfirmRemoval\(false\)/);
  }
  assert.match(part("CreatePlanForm", "AddVariantForm"), /blockAfterSuccess: true/);
  assert.doesNotMatch(source, /publishProtocolVersion\.bind/);
  assert.match(server, /requireRole\("admin"\)/);
  assert.match(server, /!isSingleConfirmedFormValue\(formData, "confirmPublication"\)/);
});

test("human approval and publication revalidate the persisted exact-version plan",()=>{
 for(const [action,write] of [
  ["approveProtocolVersion","createAccessibleProtocolVersionApproval"],
  ["publishProtocolVersion","createAccessibleProtocolPublication"],
 ] as const){
  const start=server.indexOf("export async function "+action+"(");
  const end=server.indexOf("\nexport async function ",start+30);
  const section=server.slice(start,end);
  const validation=section.indexOf("getProtocolDraftReadiness(savedPlans[0] ?? null)");
  const persisted=section.indexOf("listAccessibleProtocolVersionMealPlans([accessible.version.id])");
  const writePos=section.indexOf("await "+write+"(");
  assert.ok(persisted>=0 && validation>persisted && writePos>validation,action);
  assert.ok(section.includes("if (!readiness.ready)"),action);
  assert.ok(section.includes("success: false"),action);
 }
});
