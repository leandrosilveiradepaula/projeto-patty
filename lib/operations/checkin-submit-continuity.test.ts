import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const client = read("app/cliente/checkins/page.tsx");
const admin = read("app/admin/clientes/[clienteId]/checkins/page.tsx");
const guard = read("components/checkins/CheckinActionForm.tsx");

test("client recording and correction forms all guard appending events against repeated clicks", () => {
  for (const action of [
    "addLiquidIntakeAction",
    "recordActivityCheckinAction",
    "correctLiquidIntakeAction",
    "correctActivityCheckinAction",
  ]) {
    assert.ok(client.includes("action={" + action + "}"), action);
  }
  assert.equal((client.match(/<CheckinActionForm\\b/g) ?? []).length, 5);
  assert.equal((client.match(/<\\/CheckinActionForm>/g) ?? []).length, 5);
  assert.equal((client.match(/<CheckinSubmitButton\\b/g) ?? []).length, 8);
  assert.equal((client.match(/<\\/CheckinSubmitButton>/g) ?? []).length, 8);
});

test("professional corrections use the same protection without touching client permissions", () => {
  assert.ok(admin.includes("action={correctClientLiquidIntakeAction.bind(null, client.id)}"));
  assert.ok(admin.includes("action={correctClientActivityCheckinAction.bind(null, client.id)}"));
  assert.equal((admin.match(/<CheckinActionForm\\b/g) ?? []).length, 2);
  assert.equal((admin.match(/<\\/CheckinActionForm>/g) ?? []).length, 2);
  assert.equal((admin.match(/<CheckinSubmitButton\\b/g) ?? []).length, 3);
  assert.equal((admin.match(/<\\/CheckinSubmitButton>/g) ?? []).length, 3);
});

test("factual history GET filters do not append events or change into server actions", () => {
  assert.ok(client.includes('<form action="/cliente/checkins"'));
  assert.ok(client.includes('method="get"'));
  assert.ok(admin.includes('method="get"'));
  assert.ok(admin.includes("Consultar histórico"));
});

test("check-in form blocks a second submission before React pending state settles", () => {
  assert.ok(guard.includes("const inFlightRef = useRef(false)"));
  assert.ok(guard.includes("if (inFlightRef.current)"));
  assert.ok(guard.includes("event.preventDefault()"));
  assert.ok(guard.includes("inFlightRef.current = true"));
  assert.ok(guard.includes("setSubmitting(true)"));
  assert.ok(guard.includes("aria-busy={submitting}"));
  assert.ok(guard.includes('role="status"'));
  assert.ok(guard.includes("Aguarde a confirmação"));
});

test("a completed server action releases the lock even if the client route is preserved", () => {
  assert.ok(guard.includes("CheckinSubmissionLifecycle"));
  assert.ok(guard.includes("sawPendingRef.current = true"));
  assert.ok(guard.includes("onFinished()"));
  assert.ok(guard.includes("inFlightRef.current = false"));
  assert.ok(guard.includes("setSubmitting(false)"));
});

test("both activity response options retain their original submitter intent", () => {
  for (const source of [client, admin]) {
    assert.ok(source.includes('name="didActivity"'), source === client ? "client" : "admin");
    assert.ok(source.includes('value="yes"'));
    assert.ok(source.includes('value="no"'));
  }
  assert.ok(guard.includes('data?.get(name) === value'));
  assert.ok(guard.includes('name={name}'));
  assert.ok(guard.includes('value={value}'));
  assert.ok(guard.includes('type="submit"'));
  assert.ok(guard.includes('disabled={Boolean(disabled || pending)}'));
});

test("technical liquid limit and historical type selection remain unchanged", () => {
  for (const source of [client, admin]) {
    assert.ok(source.includes("2_147_483_647"));
    assert.ok(source.includes("liquidCorrectionSelection("));
    assert.ok(source.includes("kindSelection.requiresChoice"));
    assert.ok(source.includes("liquidTaxonomy.kinds.length === 0"));
    assert.ok(source.includes("Original:"));
  }
});

test("client and Patty server mutations preserve Auth RLS and append-only corrections", () => {
  const clientActions = read("app/cliente/checkins/actions.ts");
  const adminActions = read("app/admin/clientes/[clienteId]/checkins/actions.ts");
  assert.ok(clientActions.includes('requireRole("client")'));
  assert.ok(adminActions.includes('requireRole("admin")'));
  assert.ok(adminActions.includes("getAccessibleClient(clientId)"));
  for (const source of [clientActions, adminActions]) {
    assert.ok(source.includes("createAccessibleClientLiquidIntakeEventCorrection({"));
    assert.ok(source.includes("createAccessibleClientActivityCheckinEventCorrection({"));
    assert.ok(source.includes("revalidatePath"));
    assert.ok(!source.includes('update("client_liquid_intake_events")'));
  }
});
