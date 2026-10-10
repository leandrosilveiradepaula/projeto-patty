import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("professional client name refreshes canonical identity after success", () => {
  const form = read("components/admin/AdminClientNameEditForm.tsx");
  assert.ok(form.includes('useRouter'));
  assert.ok(form.includes('if (state.success) router.refresh()'));
  assert.ok(form.includes('name="displayName"'));
  assert.ok(form.includes('maxLength={120}'));
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  assert.ok(action.includes("validateClientDisplayName(displayName)"));
  assert.ok(action.includes("updateStandaloneClientFullNamePrivileged"));
});

test("changing Cadastro Atual refreshes visible contact details without changing login email", () => {
  const form = read("components/admin/AdminClientRegistrationEditForm.tsx");
  assert.ok(form.includes('if (state.success) router.refresh()'));
  assert.ok(form.includes('name="contactEmail"'));
  assert.ok(form.includes('email operacional de contato') || form.includes('Email operacional de contato'));
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  assert.ok(action.includes("parseClientRegistrationForm(formData)"));
  assert.ok(action.includes("upsertClientRegistrationPrivileged"));
  assert.ok(!form.includes("auth.users"));
});

test("weekly feedback channel refreshes after saving an immutable preference version", () => {
  const form = read("components/admin/AdminWeeklyFeedbackNotificationPreferenceForm.tsx");
  assert.ok(form.includes('if (state.success) router.refresh()'));
  assert.ok(form.includes('key={currentVersionId ?? "unconfigured"}'));
  assert.ok(form.includes('disabled={isPending || state.success}'));
  assert.ok(form.includes('name="channel"'));
  assert.ok(form.includes('key={props.currentVersionId ?? "unconfigured"}'));
  for (const channel of ['email','whatsapp','in_app']) assert.ok(form.includes('value="' + channel + '"'));
});

test("new notification channel uses server-side version precondition, not UI-only state", () => {
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  assert.ok(action.includes("expectedActiveVersionId"));
  assert.ok(action.includes("activateWeeklyFeedbackNotificationPreference({"));
  assert.ok(action.includes("revalidatePath(`/admin/clientes/${client.id}`)"));
});

test("manual invitation can be copied after success but cannot be accidentally provisioned twice", () => {
  const form = read("components/admin/ManualClientInviteForm.tsx");
  assert.ok(!form.includes('className={styles.form} noValidate'));
  assert.ok(form.includes('disabled={state.success} loading={isPending} type="submit"'));
  assert.ok(form.includes('disabled={state.success}'));
  assert.ok(form.includes('state.activationLink'));
  assert.ok(form.includes('copyActivationLink'));
  assert.ok(form.includes('href={`/admin/clientes/${state.clientId}?onboarding=link-generated`}'));
});

test("automatic and manual invitation share browser hints and server-side name/email guards", () => {
  for (const file of ["components/admin/ClientInviteForm.tsx","components/admin/ManualClientInviteForm.tsx"]) {
    const form = read(file);
    assert.ok(!form.includes('className={styles.form} noValidate'),file);
    assert.ok(form.includes('maxLength={254}'),file);
    assert.ok(form.includes('maxLength={120}'),file);
    assert.ok(form.includes('type="email"'),file);
    assert.ok(form.includes('required'),file);
  }
  const action = read("app/admin/clientes/nova/actions.ts");
  assert.ok(action.includes("validateClientDisplayName(displayName)"));
  assert.ok(action.includes("validateInvitationEmail(email)"));
  assert.ok(action.includes('requireRole("admin")'));
});

test("manual recovery link avoids inadvertent token regeneration and stays copyable", () => {
  const form = read("components/admin/AdminClientRecoveryLinkForm.tsx");
  assert.ok(form.includes('disabled={Boolean(state.recoveryLink)}'));
  assert.ok(form.includes('disabled={isPending} onClick={copyRecoveryLink}'));
  assert.ok(form.includes('readOnly'));
  assert.ok(form.includes('navigator.clipboard.writeText(state.recoveryLink)'));
  assert.ok(form.includes("não salve o link em locais públicos") || form.includes("não salve o link em locais públicos"));
});

test("sensitive manual access link originates only from configured trusted URL", () => {
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  assert.ok(action.includes("resolveTrustedClientAccessOrigin()"));
  assert.ok(action.includes('recoveryUrl.searchParams.set("token_hash"'));
  assert.ok(action.includes("generateClientRecoveryToken({"));
  assert.ok(!read("components/admin/AdminClientRecoveryLinkForm.tsx").includes("console.log(state.recoveryLink)"));
});

test("ending the active follow-up is guarded against repeated submissions", () => {
  const form = read("components/admin/AdminEndClientAssignmentForm.tsx");
  assert.ok(form.includes("const inFlightRef = useRef(false)"));
  assert.ok(form.includes("if (inFlightRef.current)"));
  assert.ok(form.includes("event.preventDefault()"));
  assert.ok(form.includes("inFlightRef.current = true"));
  assert.ok(form.includes("disabled={!confirmed || isSubmitting}"));
  assert.ok(form.includes("disabled={isSubmitting}"));
  assert.ok(form.includes("Histórico, avaliações, protocolos, treinos, arquivos"));
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  assert.ok(action.includes('formData.get("confirmEndAssignment") !== "yes"'));
  assert.ok(action.includes("endCurrentAdminClientAssignments"));
});

test("administrative overview uses exactly the same request and open-version ordering as training workspace", () => {
  const page = read("app/admin/clientes/[clienteId]/page.tsx");
  const workspace = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  assert.ok(page.includes("newestTrainingRequests(trainingRequests)"));
  assert.ok(page.includes("newestUnpublishedTrainingVersion(trainingVersions)"));
  assert.ok(page.includes("orderedTrainingRequests[0].requested_at"));
  assert.ok(workspace.includes("newestTrainingRequests(requests)"));
  assert.ok(workspace.includes("newestUnpublishedTrainingVersion(versions)"));
});

test("overview still surfaces a later training request while a draft is under review", () => {
  const page = read("app/admin/clientes/[clienteId]/page.tsx");
  assert.ok(page.includes("newTrainingRequestAfterPublication && openTrainingVersion"));
  assert.ok(page.includes("Confirme") || page.includes("Confira"));
  assert.ok(page.includes("treino em edição") || page.includes("rascunho de treino em edição"));
  assert.ok(page.includes('href={`/admin/clientes/${client.id}/treino`}'));
});

test("onboarding and canonical registration remain separate from Auth profile or contact email", () => {
  const form = read("components/admin/AdminClientRegistrationEditForm.tsx");
  assert.ok(form.includes("Esta ação altera somente o Cadastro Atual"));
  const page = read("app/admin/clientes/[clienteId]/page.tsx");
  assert.ok(page.includes("client.full_name?.trim()"));
  assert.ok(page.includes('client.status === "active"'));
  const invite = read("app/admin/clientes/nova/actions.ts");
  assert.ok(invite.includes("normalizeInvitationEmail(email)"));
});
