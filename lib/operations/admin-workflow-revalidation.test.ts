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

test("anamnesis review refreshes the admin dashboard and pending queue only after persistence", () => {
  const action = read("app/admin/anamneses/[anamneseId]/revisao/actions.ts");
  const review = action.slice(action.indexOf("export async function addAnamnesisReviewNote("));
  assert.match(review, /await createAccessibleAnamnesisReview\(/);
  assert.match(review, /revalidatePath\("\/admin"\)/);
  assert.match(review, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.ok(review.indexOf('revalidatePath("/admin/pendencias")') > review.indexOf("await createAccessibleAnamnesisReview("));
});

test("Cadastro Atual and feedback channel changes refresh operational readiness", () => {
  const adminAction = read("app/admin/clientes/[clienteId]/actions.ts");
  const clientAction = read("app/cliente/perfil/actions.ts");
  const adminRegistration = adminAction.slice(adminAction.indexOf("export async function updateAdminClientRegistrationAction("), adminAction.indexOf("export type ManualRecoveryLinkState"));
  assert.match(adminRegistration, /await upsertClientRegistrationPrivileged\(/);
  assert.match(adminRegistration, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.ok(adminRegistration.indexOf('revalidatePath("/admin/pendencias")') > adminRegistration.indexOf("await upsertClientRegistrationPrivileged("));
  const clientRegistration = clientAction.slice(clientAction.indexOf("export async function updateCurrentClientRegistrationAction("));
  assert.match(clientRegistration, /await upsertClientRegistrationPrivileged\(/);
  assert.match(clientRegistration, /revalidatePath\("\/admin"\)/);
  assert.match(clientRegistration, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(clientRegistration, /revalidatePath\(\`\/admin\/clientes\/\$\{client\.id\}\`\)/);
  const preference = adminAction.slice(adminAction.indexOf("export async function updateWeeklyFeedbackNotificationPreferenceAction("));
  assert.match(preference, /await activateWeeklyFeedbackNotificationPreference\(/);
  assert.match(preference, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.ok(preference.indexOf('revalidatePath("/admin/pendencias")') > preference.indexOf("await activateWeeklyFeedbackNotificationPreference("));
});

test("training lifecycle mutations keep the operational queue current", () => {
  const adminClient = read("app/admin/clientes/[clienteId]/actions.ts");
  const training = read("app/admin/clientes/[clienteId]/treino/actions.ts");
  const request = adminClient.slice(adminClient.indexOf("export async function recordTrainingRequestAction("), adminClient.indexOf("export type AdminClientRegistrationFormState"));
  assert.match(request, /await createAccessibleClientTrainingRequest\(/);
  assert.match(request, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(request, /revalidatePath\(\`\/admin\/clientes\/\$\{client\.id\}\/treino\`\)/);
  const helper = training.slice(training.indexOf("function revalidateTraining("), training.indexOf("export async function createTrainingPlanDraftAction("));
  assert.match(helper, /revalidatePath\("\/admin"\)/);
  assert.match(helper, /revalidatePath\("\/admin\/pendencias"\)/);
  for (const name of ["createTrainingPlanDraftAction", "reviewTrainingPlanVersionAction", "publishTrainingPlanVersionAction"]) {
    const lifecycle = training.slice(training.indexOf("export async function " + name));
    assert.match(lifecycle, /revalidateTraining\(client\.id\)/);
  }
});

test("private file acceptance and release refresh release pendencies after confirmed state", () => {
  const action = read("app/admin/clientes/[clienteId]/arquivos/actions.ts");
  const finalize = action.slice(action.indexOf("export async function finalizeAdminPrivateFileUploadSessionAction("), action.indexOf("export type AdminPrivateFileReleaseState"));
  assert.match(finalize, /const result = await finalizeClientFileUploadSession\(/);
  assert.match(finalize, /if \(result\.status === "accepted"\)/);
  assert.match(finalize, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(finalize, /revalidatePath\(\`\/admin\/clientes\/\$\{clientId\}\`\)/);
  assert.ok(finalize.indexOf('revalidatePath("/admin/pendencias")') > finalize.indexOf('if (result.status === "accepted")'));
  const release = action.slice(action.indexOf("export async function releaseAdminPrivateFileToClientAction("));
  assert.match(release, /const result = await releasePrivateFileToClient\(/);
  assert.match(release, /if \(result\.status === "unconfirmed"\)/);
  assert.match(release, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.ok(release.indexOf('revalidatePath("/admin/pendencias")') > release.indexOf('if (result.status === "unconfirmed")'));
});

test("ending an assignment refreshes admin scope only after a confirmed end", () => {
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  const end = action.slice(action.indexOf("export async function endClientAssignmentAction("), action.indexOf("export type AdminClientDisplayNameFormState"));
  assert.match(end, /const result = await endCurrentAdminClientAssignments\(/);
  assert.match(end, /if \(result\.endedAssignmentIds\.length === 0\)/);
  assert.match(end, /revalidatePath\("\/admin"\)/);
  assert.match(end, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.ok(end.indexOf('revalidatePath("/admin/pendencias")') > end.indexOf("if (result.endedAssignmentIds.length === 0)"));
});
