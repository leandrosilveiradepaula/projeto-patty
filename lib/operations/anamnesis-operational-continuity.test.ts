import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("Patty's new clarification request refreshes saved history after a successful action", () => {
  const form = read("components/admin/AdminAnamnesisClarificationRequestForm.tsx");
  assert.ok(form.includes("if (state.success) {"));
  assert.ok(form.includes("formRef.current?.reset()"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(form.includes("maxLength={4000}"));
  assert.ok(form.includes("disabled={isPending}"));
});

test("clarification resolution is an explicit two-step Patty decision, not client auto-resolution", () => {
  const form = read("components/admin/AdminAnamnesisClarificationResolutionForm.tsx");
  const action = read("app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts");
  assert.ok(form.includes("setConfirmResolve(true)"));
  assert.ok(form.includes("setConfirmResolve(false)"));
  assert.ok(form.includes("Confirmar resolução"));
  assert.ok(form.includes("type=\"button\""));
  assert.ok(form.includes("if (state.success) router.refresh()"));
  assert.ok(action.includes('requireRole("admin")'));
  assert.ok(action.includes("createAccessibleAnamnesisClarificationResolution({"));
});

test("client clarification response refreshes pending status without editing original answers", () => {
  const form = read("components/client/ClientAnamnesisClarificationResponseForm.tsx");
  const action = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts");
  assert.ok(form.includes("maxLength={4000}"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(form.includes("formRef.current?.reset()"));
  assert.ok(action.includes('requireRole("client")'));
  assert.ok(action.includes("listAccessibleAnamnesisClarificationResolutions"));
  assert.ok(action.includes("createAccessibleAnamnesisClarificationResponse({"));
});

test("professional review notes are private, bounded and refreshed after persistence", () => {
  const form = read("components/admin/AdminAnamnesisReviewForm.tsx");
  const action = read("app/admin/anamneses/[anamneseId]/revisao/actions.ts");
  assert.ok(form.includes("maxLength={4000}"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(form.includes("formRef.current?.reset()"));
  assert.ok(action.includes('requireRole("admin")'));
  assert.ok(action.includes("createAccessibleAnamnesisReview("));
});

test("historical correction refreshes the visible effective value while preserving originals", () => {
  const form = read("components/admin/AdminAnamnesisCorrectionForm.tsx");
  const page = read("app/admin/anamneses/[anamneseId]/correcoes/page.tsx");
  const action = read("app/admin/anamneses/[anamneseId]/correcoes/actions.ts");
  assert.ok(form.includes("if (state.success) router.refresh()"));
  assert.ok(form.includes("disabled={state.success}"));
  assert.ok(page.includes("key={answerCorrections.at(-1)?.id ?? answer.id}"));
  assert.ok(page.includes("formatJson(answer.answer_value)"));
  assert.ok(page.includes("answerCorrections.map((correction)"));
  assert.ok(action.includes("createAccessibleAnamnesisAnswerCorrection({"));
  assert.ok(action.includes("parseCorrectionJson(rawValue)"));
});

test("client final submission refreshes its real status and disables duplicate submission on success", () => {
  const form = read("components/client/ClientAnamnesisSubmitForm.tsx");
  const action = read("app/cliente/anamnese/[anamneseId]/actions.ts");
  assert.ok(form.includes("if (state.success) router.refresh()"));
  assert.ok(form.includes("disabled={state.success}"));
  assert.ok(form.includes('name="consentAccepted"'));
  assert.ok(action.includes("submitClientAnamnesis"));
});

test("clarification source answer rejects injected non-text fields before reading private answers", () => {
  const action = read("app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts");
  const i = action.indexOf('rawSourceAnswerId !== null && typeof rawSourceAnswerId !== "string"');
  const lookup = action.indexOf("getAccessibleAnamnesisAnswer(rawSourceAnswerId)");
  assert.ok(i >= 0 && lookup > i);
  assert.ok(action.includes("sourceAnswer.submission_id !== submission.id"));
});

test("anamnesis professional workspace displays the canonical client name with legacy fallback", () => {
  for (const path of [
    "app/admin/anamneses/[anamneseId]/correcoes/page.tsx",
    "app/admin/anamneses/[anamneseId]/revisao/page.tsx",
  ]) {
    const page = read(path);
    assert.ok(page.includes("submission.clients?.full_name?.trim()"));
    assert.ok(page.includes("submission.clients?.profiles?.display_name?.trim()"));
  }
});

test("each authenticated anamnesis write still invalidates its appropriate client and Patty views", () => {
  const paths = [
    "app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts",
    "app/admin/anamneses/[anamneseId]/correcoes/actions.ts",
    "app/admin/anamneses/[anamneseId]/revisao/actions.ts",
    "app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts",
  ];
  for (const path of paths) {
    const action = read(path);
    assert.ok(action.includes('revalidatePath("/admin/pendencias")'), path);
    assert.ok(action.includes("revalidatePath("), path);
  }
});

test("original response, client clarification, professional review and AI interpretation remain separate", () => {
  const adminPage = read("app/admin/anamneses/[anamneseId]/esclarecimentos/page.tsx");
  const clientPage = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/page.tsx");
  assert.ok(adminPage.includes("A resposta da cliente não resolve o pedido automaticamente"));
  assert.ok(clientPage.includes("Este pedido já foi marcado como resolvido pela Patty"));
  assert.ok(adminPage.includes("sourceAnswer.answer_value"));
  assert.ok(clientPage.includes("requestResponses.map"));
});
