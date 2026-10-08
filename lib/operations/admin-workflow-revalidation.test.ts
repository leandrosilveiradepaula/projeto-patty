import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("new assessment draft refreshes Patty's pending queue only after creation", () => {
  const action = read("app/admin/clientes/[clienteId]/avaliacoes/actions.ts");
  assert.match(action, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(action, /revalidatePath\("\/admin"\)/);
  assert.match(action, /revalidatePath\("\/admin\/avaliacoes"\)/);
  assert.ok(action.indexOf('revalidatePath("/admin/pendencias")') > action.indexOf("assessment = await createAccessibleClientAssessment("));
});

test("assessment finalization refreshes pending and corrections refresh client measurement history", () => {
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  const finalized = action.slice(action.indexOf("export async function finalizeAssessmentAction("), action.indexOf("export type AssessmentCorrectionFormState"));
  assert.match(finalized, /await finalizeAssessmentWithMethodSnapshot\(/);
  assert.match(finalized, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(finalized, /revalidatePath\("\/admin"\)/);
  assert.match(finalized, /revalidatePath\("\/cliente\/avaliacoes"\)/);
  const correction = action.slice(action.indexOf("export async function correctFinalizedAssessmentMeasurementAction("));
  assert.match(correction, /await createAccessibleAssessmentMeasurementCorrection\(/);
  assert.match(correction, /revalidatePath\("\/cliente\/avaliacoes"\)/);
  assert.match(correction, /revalidatePath\("\/cliente\/evolucao"\)/);
  assert.ok(correction.indexOf('revalidatePath("/cliente/avaliacoes")') > correction.indexOf("await createAccessibleAssessmentMeasurementCorrection("));
});

test("initial or recovered protocol becomes visible in the queue after saving", () => {
  const page = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");
  const created = page.slice(page.indexOf("async function createFirstProtocolAction"), page.indexOf("async function resumeVersionlessProtocolAction"));
  const recovered = page.slice(page.indexOf("async function resumeVersionlessProtocolAction"), page.indexOf("type AdminClientProtocolsPageProps"));
  assert.match(created, /await createAccessibleInitialProtocolVersion\(/);
  assert.match(created, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(recovered, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(created, /revalidatePath\("\/admin\/protocolos"\)/);
  assert.match(recovered, /revalidatePath\("\/admin\/protocolos"\)/);
});

test("editing or transitioning a protocol invalidates the operational queue", () => {
  const action = read("app/admin/protocolos/[protocoloId]/actions.ts");
  const helper = action.slice(action.indexOf("function revalidateProtocolPaths("), action.indexOf("function parseTrimmedText("));
  assert.match(helper, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(helper, /revalidatePath\("\/cliente\/protocolo"\)/);
  for (const name of ["submitProtocolVersionForReview", "approveProtocolVersion", "publishProtocolVersion"]) {
    const lifecycle = action.slice(action.indexOf("export async function " + name));
    assert.match(lifecycle, /revalidateProtocolPaths\(/);
  }
});
