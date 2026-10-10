import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const client = read("app/cliente/checkins/page.tsx");
const admin = read("app/admin/clientes/[clienteId]/checkins/page.tsx");
const clientAction = read("app/cliente/checkins/actions.ts");
const adminAction = read("app/admin/clientes/[clienteId]/checkins/actions.ts");

test("both private check-in views display the latest append-only correction", () => {
  for (const source of [client, admin]) {
    assert.ok(source.includes("latestCheckinCorrectionsByEvent(liquidCorrections)"));
    assert.ok(source.includes("latestCheckinCorrectionsByEvent(activityCorrections)"));
    assert.ok(source.includes("Original:"));
    assert.ok(source.includes("liquidCorrectionSelection("));
    assert.ok(source.includes('disabled={liquidTaxonomy.kinds.length === 0}'));
    assert.ok(source.includes('value="">Tipo histórico indisponível. Escolha um tipo ativo.'));
  }
});

test("both liquid correction selectors avoid implicit remapping to first active kind", () => {
  assert.ok(client.includes("defaultValue={kindSelection.defaultValue}"));
  assert.ok(admin.includes("defaultValue={kindSelection.defaultValue}"));
  assert.ok(client.includes("kindSelection.requiresChoice"));
  assert.ok(admin.includes("kindSelection.requiresChoice"));
  assert.ok(client.includes("const activeLiquidKindKeys = liquidTaxonomy.kinds.map"));
  assert.ok(admin.includes("const activeLiquidKindKeys = liquidTaxonomy.kinds.map"));
});

test("client cannot submit new liquid without configured kinds and sees why", () => {
  assert.ok(client.includes('title="Tipos de líquido indisponíveis"'));
  assert.match(client, /<CheckinSubmitButton\s+disabled=\{liquidTaxonomy\.kinds\.length === 0\}\s*>Registrar líquido/);
  assert.ok(client.includes('max={2_147_483_647}'));
  assert.ok(client.includes('step="1"'));
});

test("admin invalid day shows explicit feedback rather than silently returning recent records", () => {
  assert.ok(admin.includes("invalidHistoryDay = dia !== undefined && selectedDay === null"));
  assert.ok(admin.includes('title="Data do histórico inválida"'));
  assert.ok(admin.includes("Exibimos os registros recentes"));
  assert.ok(admin.includes('parseCheckinHistoryDay(dia, today)'));
});

test("both correction flows preserve selected day on errors and success", () => {
  assert.ok(adminAction.includes("function correctionReturnPath("));
  assert.ok(adminAction.includes('parseCheckinHistoryDay(formData.get("historyDay"), today)'));
  assert.ok(adminAction.includes("checkinHistorySearch(day) + anchor"));
  for (const state of ["correction-invalid", "correction-error", "correction-recorded"]) {
    assert.ok(adminAction.includes(`correctionReturnPath(clientId, "${state}", formData, "liquido")`));
    assert.ok(adminAction.includes(`correctionReturnPath(clientId, "${state}", formData, "atividade")`));
    assert.ok(clientAction.includes(`correctionRedirect("${state}", formData, "liquido")`));
    assert.ok(clientAction.includes(`correctionRedirect("${state}", formData, "atividade")`));
  }
});

test("deep link anchors are built only from validated event UUIDs", () => {
  for (const source of [clientAction, adminAction]) {
    assert.ok(source.includes('isUuid(eventId)'));
    assert.ok(source.includes('`#${kind}-${eventId}`'));
  }
  for (const source of [client, admin]) {
    assert.ok(source.includes('id={`liquido-${event.id}`}'));
    assert.ok(source.includes('id={`atividade-${event.id}`}'));
  }
  assert.ok(client.includes('id={`atividade-${latestActivity.id}`}'));
});

test("authenticated correction paths still validate ownership and only append corrections", () => {
  assert.ok(clientAction.includes('requireRole("client")'));
  assert.ok(adminAction.includes('requireRole("admin")'));
  assert.ok(adminAction.includes('getAccessibleClient(clientId)'));
  for (const source of [clientAction, adminAction]) {
    assert.ok(source.includes("events.find((item) => item.id === eventId)"));
    assert.ok(source.includes("createAccessibleClientLiquidIntakeEventCorrection({"));
    assert.ok(source.includes("createAccessibleClientActivityCheckinEventCorrection({"));
    assert.ok(source.includes('revalidatePath("/cliente/checkins")'));
    assert.ok(!source.includes('.from("client_activity_checkin_events").update'));
  }
});

test("client and Patty keep factual liquid records separate from any hydration target", () => {
  assert.ok(client.includes("O aplicativo não define automaticamente uma meta diária de hidratação"));
  assert.ok(admin.includes("sem meta automática"));
  assert.ok(!client.includes("35 *"));
  assert.ok(!admin.includes("0.7 *"));
});
