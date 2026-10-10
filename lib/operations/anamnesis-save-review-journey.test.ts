import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("client can explicitly refresh factual saved-answer progress without full browser reload", () => {
  const page = read("app/cliente/anamnese/[anamneseId]/page.tsx");
  const control = read("components/client/ClientAnamnesisDraftProgressRefresh.tsx");
  assert.ok(page.includes("ClientAnamnesisDraftProgressRefresh"));
  assert.ok(page.includes("summarizeAnamnesisDraftRequiredAnswers("));
  assert.ok(page.includes("firstMissingQuestionId"));
  assert.ok(control.includes("startTransition(() => router.refresh())"));
  assert.ok(control.includes("disabled={isRefreshing}"));
  assert.ok(control.includes("Atualizar resumo de respostas salvas"));
  assert.ok(page.includes("O envio final continua sujeito à validação do banco"));
});

test("text draft save failure preserves entered text and provides a direct retry", () => {
  const source = read("components/client/ClientAnamnesisDraftTextAnswerForm.tsx");
  assert.ok(source.includes("pendingValueRef.current = value"));
  assert.ok(source.includes("lastSavedValueRef.current"));
  assert.ok(source.includes("failedValueRef.current"));
  assert.ok(source.includes("onBlur={saveIfChanged}"));
  assert.ok(source.includes("onClick={saveIfChanged}"));
  assert.ok(source.includes("Tentar salvar novamente"));
  assert.ok(source.includes("Sua resposta permanece neste campo"));
  assert.ok(source.includes("value={value}"));
  assert.ok(source.includes("Não salvo. Sua resposta ainda está no campo"));
});

test("text answer describes both delayed autosave and the difference between saved and unsaved", () => {
  const source = read("components/client/ClientAnamnesisDraftTextAnswerForm.tsx");
  assert.ok(source.includes("window.setTimeout"));
  assert.ok(source.includes("window.clearTimeout"));
  assert.ok(source.includes("Alterações não salvas"));
  assert.ok(source.includes("Salvo automaticamente."));
  assert.ok(source.includes("isPending"));
  assert.ok(source.includes("state.message && !state.success"));
});

test("conditional answers update applicability through Next router instead of navigating away", () => {
  const form = read("components/client/ClientAnamnesisDraftSingleChoiceAnswerForm.tsx");
  const page = read("app/cliente/anamnese/[anamneseId]/page.tsx");
  assert.ok(page.includes("reloadPageOnSuccess={controlsApplicability}"));
  assert.ok(form.includes("if (reloadPageOnSuccess)"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(!form.includes("window.location.assign("));
  assert.ok(page.includes("getApplicableAnamnesisQuestionIds("));
});

test("single-choice draft feedback does not claim unsaved selection was saved", () => {
  const form = read("components/client/ClientAnamnesisDraftSingleChoiceAnswerForm.tsx");
  assert.ok(form.includes("selectedValue === lastSavedValueRef.current"));
  assert.ok(form.includes("Alterações não salvas"));
  assert.ok(form.includes("Não salvo. Selecione novamente"));
  assert.ok(form.includes("disabled={isPending}"));
  assert.ok(form.includes("Tentar salvar novamente"));
  assert.ok(form.includes("requestSubmit()"));
});

test("removed historical choice cannot be silently replaced with current first option", () => {
  const form = read("components/client/ClientAnamnesisDraftSingleChoiceAnswerForm.tsx");
  assert.ok(form.includes("!options.includes(selectedValue)"));
  assert.ok(form.includes("Resposta histórica indisponível"));
  assert.ok(form.includes("sem substituição automática"));
  assert.ok(form.includes("checked={selectedValue === option}"));
  assert.ok(!form.includes("setSelectedValue(options[0])"));
});

test("client final submission still explicitly records exact consent and cannot double-submit", () => {
  const form = read("components/client/ClientAnamnesisSubmitForm.tsx");
  const action = read("app/cliente/anamnese/[anamneseId]/actions.ts");
  assert.ok(form.includes("inFlightRef.current = true"));
  assert.ok(form.includes("event.preventDefault()"));
  assert.ok(form.includes("disabled={isPending || state.success}"));
  assert.ok(form.includes("disabled={state.success || isPending}"));
  assert.ok(form.includes('name="consentAccepted"'));
  assert.ok(form.includes('value="Concordo"'));
  assert.ok(form.includes("Aguarde a confirmação de salvamento"));
  assert.ok(action.includes("isAnamnesisConsentAccepted("));
  assert.ok(action.includes("submitCurrentClientAnamnesisDraft("));
  assert.ok(action.includes("redirect("));
});

test("Patty's clarification request is bounded, selected on the same original submission, and guarded", () => {
  const form = read("components/admin/AdminAnamnesisClarificationRequestForm.tsx");
  const actions = read("app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts");
  assert.ok(form.includes("const inFlightRef = useRef(false)"));
  assert.ok(form.includes("if (inFlightRef.current || isPending)"));
  assert.ok(form.includes("disabled={isPending}"));
  assert.ok(form.includes("maxLength={4000}"));
  assert.ok(form.includes("formRef.current?.reset()"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(actions.includes("sourceAnswer.submission_id !== submission.id"));
  assert.ok(actions.includes("createAccessibleAnamnesisClarificationRequest({"));
});

test("client's clarification response remains separate from original answer and prevents duplicate writes", () => {
  const form = read("components/client/ClientAnamnesisClarificationResponseForm.tsx");
  const actions = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts");
  assert.ok(form.includes("const inFlightRef = useRef(false)"));
  assert.ok(form.includes("if (inFlightRef.current || isPending)"));
  assert.ok(form.includes("maxLength={4000}"));
  assert.ok(form.includes("disabled={isPending}"));
  assert.ok(form.includes("formRef.current?.reset()"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(actions.includes('requireRole("client")'));
  assert.ok(actions.includes("createAccessibleAnamnesisClarificationResponse({"));
});

test("professional notes keep append-only historical meaning and are guarded against repeats", () => {
  const form = read("components/admin/AdminAnamnesisReviewForm.tsx");
  const actions = read("app/admin/anamneses/[anamneseId]/revisao/actions.ts");
  assert.ok(form.includes("inFlightRef.current = true"));
  assert.ok(form.includes("event.preventDefault()"));
  assert.ok(form.includes("disabled={isPending}"));
  assert.ok(form.includes("formRef.current?.reset()"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(actions.includes("createAccessibleAnamnesisReview("));
  assert.ok(!form.includes("publish"));
});

test("Patty resolution requires a deliberate confirm and blocks repeated resolved events", () => {
  const form = read("components/admin/AdminAnamnesisClarificationResolutionForm.tsx");
  const actions = read("app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts");
  assert.ok(form.includes("!confirmResolve"));
  assert.ok(form.includes("inFlightRef.current || isPending || state.success"));
  assert.ok(form.includes("Confirmar resolução"));
  assert.ok(form.includes("Cancelar"));
  assert.ok(form.includes("disabled={isPending || state.success}"));
  assert.ok(actions.includes("createAccessibleAnamnesisClarificationResolution({"));
  assert.ok(!form.includes("createAccessibleAnamnesisClarificationResolution("));
});

test("historical professional correction is append-only, never automatically published or duplicated", () => {
  const form = read("components/admin/AdminAnamnesisCorrectionForm.tsx");
  const actions = read("app/admin/anamneses/[anamneseId]/correcoes/actions.ts");
  assert.ok(form.includes("inFlightRef.current || isPending || state.success"));
  assert.ok(form.includes("disabled={isPending || state.success}"));
  assert.ok(form.includes("disabled={state.success || isPending}"));
  assert.ok(form.includes("router.refresh()"));
  assert.ok(actions.includes("createAccessibleAnamnesisAnswerCorrection({"));
  assert.ok(actions.includes("parseCorrectionJson(rawValue)"));
  assert.ok(!actions.includes("updateAccessibleAnamnesisAnswer("));
});

test("all follow-up forms reset their own in-flight refs after server reply", () => {
  const paths = [
    "components/admin/AdminAnamnesisClarificationRequestForm.tsx",
    "components/admin/AdminAnamnesisReviewForm.tsx",
    "components/client/ClientAnamnesisClarificationResponseForm.tsx",
    "components/admin/AdminAnamnesisClarificationResolutionForm.tsx",
    "components/admin/AdminAnamnesisCorrectionForm.tsx",
  ];
  for (const path of paths) {
    const f = read(path);
    assert.ok(f.includes("inFlightRef.current = true"), path);
    assert.ok(f.includes("inFlightRef.current = false"), path);
    assert.ok(f.includes("aria-busy={isPending}"), path);
  }
});
