import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const editor = read("components/admin/AdminProtocolDraftEditor.tsx");

function componentSource(name: string, nextName?: string) {
  const start = editor.indexOf("function " + name + "(");
  assert.ok(start >= 0, name);
  const end = nextName ? editor.indexOf("function " + nextName + "(", start + 1) : editor.length;
  assert.ok(end > start, name);
  return editor.slice(start, end);
}

test("draft editor refreshes only after persisted mutation succeeds", () => {
  assert.ok(editor.includes("function usePersistedProtocolRefresh("));
  assert.ok(editor.includes("if (state.success) {"));
  assert.ok(editor.includes("router.refresh()"));
  assert.ok(!editor.includes('window.location.reload()'));
});

test("initial plan creation refreshes the actual version workspace", () => {
  const source = componentSource("CreatePlanForm", "AddVariantForm");
  assert.ok(source.includes("createProtocolMealPlan.bind"));
  assert.ok(source.includes("usePersistedProtocolRefresh(state)"));
});

test("adding variants, meals or doses resets inputs only after persistence", () => {
  const cases = [
    ["AddVariantForm", "AddMealForm", "addProtocolMealPlanVariant"],
    ["AddMealForm", "AddDoseForm", "addProtocolMeal.bind"],
    ["AddDoseForm", "UpdateVariantForm", "addProtocolMealDose.bind"],
  ] as const;
  for (const [name, next, action] of cases) {
    const source = componentSource(name, next);
    assert.ok(source.includes(action), name);
    assert.ok(source.includes("useRef<HTMLFormElement>(null)"), name);
    assert.ok(source.includes("usePersistedProtocolRefresh(state, formRef)"), name);
    assert.ok(source.includes("ref={formRef}"), name);
  }
});

test("renaming variants, meals and updating doses synchronizes saved data", () => {
  for (const [name, next] of [
    ["UpdateVariantForm", "RemoveVariantForm"],
    ["UpdateMealForm", "RemoveMealForm"],
  ]) {
    assert.ok(componentSource(name, next).includes("usePersistedProtocolRefresh(state)"), name);
  }
  const dose = componentSource("DoseRow");
  assert.ok(dose.includes("usePersistedProtocolRefresh(updateState)"));
});

test("deleting empty variants and meals needs a distinct cancelable confirmation", () => {
  const names = [
    ["RemoveVariantForm", "UpdateMealForm"],
    ["RemoveMealForm", "DoseRow"],
  ] as const;
  for (const [name, next] of names) {
    const source = componentSource(name, next);
    assert.ok(source.includes("useState(false)"), name);
    assert.ok(source.includes("setConfirmRemoval(true)"), name);
    assert.ok(source.includes("setConfirmRemoval(false)"), name);
    assert.ok(source.includes("Confirmar remoção"), name);
    assert.ok(source.includes("usePersistedProtocolRefresh(state)"), name);
  }
});

test("deleting a dose is confirmed separately from editing quantity", () => {
  const source = componentSource("DoseRow");
  assert.ok(source.includes("setConfirmDoseRemoval(true)"));
  assert.ok(source.includes("setConfirmDoseRemoval(false)"));
  assert.ok(source.includes("Confirmar remoção"));
  assert.ok(source.includes("usePersistedProtocolRefresh(removeState)"));
  assert.ok(source.includes("updateProtocolMealDose.bind"));
  assert.ok(source.includes("removeProtocolMealDose.bind"));
});

test("client-facing snapshot remains isolated from the editable draft and may only be published manually", () => {
  const server = read("app/admin/protocolos/[protocoloId]/actions.ts");
  assert.ok(server.includes('requireRole("admin")'));
  assert.ok(server.includes('formData.get("confirmPublication") !== "yes"'));
  assert.ok(server.includes("createAccessibleProtocolPublication({"));
  const client = read("app/cliente/protocolo/page.tsx");
  assert.ok(client.includes("listPublishedProtocolsForCurrentClient"));
  assert.ok(!client.includes("AdminProtocolDraftEditor"));
});

test("review, approval, and publication refresh only after confirmed server responses", () => {
  const action = read("components/admin/ProtocolLifecycleAction.tsx");
  assert.ok(action.includes("if (state.success) router.refresh()"));
  assert.ok(action.includes("disabled={isPending || state.success}"));
  assert.ok(action.includes("disabled={state.success}"));
  for (const field of ["confirmSubmission", "confirmApproval", "confirmPublication"]) {
    assert.ok(action.includes(field), field);
  }
});

test("cloning a persisted version refreshes the new draft and blocks duplicate submissions after success", () => {
  const action = read("components/admin/ProtocolCloneVersionAction.tsx");
  assert.ok(action.includes("cloneProtocolVersionDraft.bind"));
  assert.ok(action.includes("if (state.success) router.refresh()"));
  assert.ok(action.includes("disabled={state.success}"));
});

test("the draft editor continues to prevent publication by itself and retains editable states", () => {
  const server = read("app/admin/protocolos/[protocoloId]/actions.ts");
  for (const action of [
    "removeProtocolMealDose", "removeProtocolMeal", "removeProtocolMealPlanVariant",
    "updateProtocolMealDose", "updateProtocolMealLabel",
  ]) {
    const start = server.indexOf("export async function " + action + "(");
    assert.ok(start >= 0, action);
    const end = server.indexOf("export async function ", start + 1);
    const section = server.slice(start, end >= 0 ? end : undefined);
    assert.ok(section.includes("accessible.lifecycleAction !== \"submit\""), action);
  }
  assert.ok(!editor.includes("publishProtocolVersion.bind"));
});

test("publication remains explicitly tied to approval and exact version", () => {
  const server = read("app/admin/protocolos/[protocoloId]/actions.ts");
  const start = server.indexOf("export async function publishProtocolVersion(");
  const end = server.indexOf("export async function cloneProtocolVersionDraft(", start);
  const section = server.slice(start, end);
  assert.ok(section.includes("accessible.lifecycleAction !== \"publish\" || !accessible.approval"));
  assert.ok(section.includes("protocolVersionId: accessible.version.id"));
  assert.ok(section.includes("approvalId: accessible.approval.id"));
});
