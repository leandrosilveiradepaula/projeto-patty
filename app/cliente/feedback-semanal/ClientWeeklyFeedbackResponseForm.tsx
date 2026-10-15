"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  saveWeeklyFeedbackAction,
  type WeeklyFeedbackSaveFormState,
} from "./actions";
import { ClientWeeklyFeedbackSubmitControls } from "./ClientWeeklyFeedbackSubmitControls";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { getWeeklyFeedbackFieldError, summarizeWeeklyFeedbackRequiredProgress, firstInvalidWeeklyFeedbackField, mayUseExplicitNotApplicable, type WeeklyFeedbackQuestion } from "@/lib/weekly-feedback/definition";
import {
  compareWeeklyFeedbackDrafts,
  reconcileWeeklyFeedbackDrafts,
  type WeeklyFeedbackCollisionChoice,
} from "@/lib/weekly-feedback/draft-reconciliation";

import { weeklyFeedbackAnswerFieldId } from "@/lib/weekly-feedback/field-ids";

import styles from "./page.module.css";

const initialState: WeeklyFeedbackSaveFormState = {
  message: null,
  outcome: "idle",
};

type Props = {
  feedbackId: string;
  expectedFingerprint: string;
  initialValues: Record<string, string>;
  questions: WeeklyFeedbackQuestion[];
};

export function ClientWeeklyFeedbackResponseForm({
  feedbackId,
  expectedFingerprint,
  initialValues,
  questions,
}: Props) {
  const action = saveWeeklyFeedbackAction.bind(null, feedbackId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  // Controlled fields retain what the client typed after any failed action.
  // No health answers are copied to URLs, local storage or logs.
  const [values, setValues] = useState(initialValues);
  // A stable component key keeps unsaved answers in memory after router.refresh.
  // Keep the OLD CAS fingerprint until the client explicitly reconciles edits.
  const [draftBase, setDraftBase] = useState(() => ({
    fingerprint: expectedFingerprint,
    values: initialValues,
  }));
  const [collisionChoices, setCollisionChoices] = useState<Record<string, WeeklyFeedbackCollisionChoice>>({});
  const [mergedAfterConflict, setMergedAfterConflict] = useState(false);
  const [editedSinceLastSave, setEditedSinceLastSave] = useState(false);
  const [attemptedFinalSubmit, setAttemptedFinalSubmit] = useState(false);
  const [touchedKeys, setTouchedKeys] = useState<string[]>([]);
  const firstInvalid = firstInvalidWeeklyFeedbackField(questions, values, attemptedFinalSubmit);
  const progress = summarizeWeeklyFeedbackRequiredProgress(questions, values);
  // Store the key in a stable const so TypeScript narrows it inside onClick.
  const firstMissingRequired = progress.firstMissingRequired;
  const inFlightRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const router = useRouter();
  const submitted = state.outcome === "submitted";
  const dirty = editedSinceLastSave && !submitted;
  const newerServerSnapshot = draftBase.fingerprint !== expectedFingerprint;
  const questionKeys = questions.map((question) => question.key);
  const differences = newerServerSnapshot
    ? compareWeeklyFeedbackDrafts(questionKeys, draftBase.values, values, initialValues)
    : [];
  const overlapping = differences.filter((difference) => difference.collision);
  const missingChoices = overlapping.some((difference) => !collisionChoices[difference.key]);

  useEffect(() => {
    inFlightRef.current = false;
    setMergedAfterConflict(false);
    // A draft remains editable and refreshes here. The definitive send is
    // redirected by the server after persistence, before this form unmounts.
    if (state.outcome === "draft-saved") {
      setEditedSinceLastSave(false);
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    // When nothing was edited locally, a refreshed server snapshot can be
    // adopted as-is. Never do this while there are unsaved local answers.
    if (newerServerSnapshot && !editedSinceLastSave) {
      setDraftBase({ fingerprint: expectedFingerprint, values: initialValues });
      setValues(initialValues);
      setCollisionChoices({});
    }
  }, [editedSinceLastSave, expectedFingerprint, initialValues, newerServerSnapshot]);

  // Server-reported validation must focus this feedback, not another pending week.
  useEffect(() => {
    if (state.outcome === "invalid" && state.questionKey) {
      document.getElementById(weeklyFeedbackAnswerFieldId(feedbackId, state.questionKey))?.focus();
    }
  }, [state, feedbackId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function updateAnswer(key: string, next: string) {
    setValues((previous) => ({ ...previous, [key]: next }));
    setEditedSinceLastSave(true);
    setReviewOpen(false);
  }

  function prepareSubmit(intent: "save" | "submit") {
    if (newerServerSnapshot) return false;
    if (intent === "submit") {
      setAttemptedFinalSubmit(true);
      const invalid = firstInvalidWeeklyFeedbackField(questions, values, true);
      if (invalid) {
        setReviewOpen(false);
        document.getElementById(weeklyFeedbackAnswerFieldId(feedbackId, invalid))?.focus();
        return false;
      }
    } else {
      const invalid = firstInvalidWeeklyFeedbackField(questions, values, false);
      if (invalid) {
        document.getElementById(weeklyFeedbackAnswerFieldId(feedbackId, invalid))?.focus();
        return false;
      }
    }
    if (intent === "submit" && !reviewOpen) {
      setReviewOpen(true);
      return false;
    }
    return true;
  }

  function combineAfterReview() {
    const reconciled = reconcileWeeklyFeedbackDrafts(
      questionKeys,
      draftBase.values,
      values,
      initialValues,
      collisionChoices,
    );
    if (!reconciled) return;
    setValues(reconciled);
    setDraftBase({ fingerprint: expectedFingerprint, values: initialValues });
    setEditedSinceLastSave(questionKeys.some((key) => reconciled[key] !== (initialValues[key] ?? "")));
    setCollisionChoices({});
    setAttemptedFinalSubmit(false);
    setTouchedKeys([]);
    setReviewOpen(false);
    setMergedAfterConflict(true);
  }

  const confirmed = (state.outcome === "draft-saved" && !editedSinceLastSave) || submitted;
  const failed = state.outcome === "invalid" ||
    state.outcome === "conflict" ||
    state.outcome === "save-error" ||
    state.outcome === "unavailable";

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        if (inFlightRef.current || isPending || submitted || newerServerSnapshot) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
    >
      <input type="hidden" name="expectedFingerprint" value={draftBase.fingerprint} />
      <div className={styles.formProgress} role="status" aria-live="polite">
        <span className={styles.fieldMeta}>Etapa 1 de 2 · Preencher e revisar</span>
        <strong>{progress.requiredCompleted} de {progress.required} perguntas obrigatórias preenchidas</strong>
        <span>{progress.completed} de {progress.total} respostas iniciadas</span>
        <progress max={progress.required || 1} value={progress.requiredCompleted} aria-label="Progresso do preenchimento obrigatório" />
        {firstMissingRequired ? <button type="button" className={styles.jumpLink} onClick={() => document.getElementById(weeklyFeedbackAnswerFieldId(feedbackId, firstMissingRequired))?.focus()}>Ir para primeira obrigatória pendente</button> : <span>Obrigatórias preenchidas. Revise e envie quando estiver pronta.</span>}
      </div>
      {state.message && (failed || confirmed) ? (
        <Alert
          live={failed ? "assertive" : "polite"}
          title={failed ? "Respostas ainda não salvas" : submitted ? "Feedback enviado" : "Rascunho salvo"}
          variant={failed ? "critical" : "success"}
        >
          {state.message}
        </Alert>
      ) : null}
      {questions.map((question, index) => {
        const fieldId = weeklyFeedbackAnswerFieldId(feedbackId, question.key);
        const error = getWeeklyFeedbackFieldError(question, values[question.key] ?? "", attemptedFinalSubmit);
        const showError = error && (attemptedFinalSubmit || touchedKeys.includes(question.key));
        return (
          <div className={styles.field} key={question.key}>
            <label htmlFor={fieldId}>
              <span className={styles.fieldNumber}>Pergunta {index + 1} de {questions.length}</span>
              <span>{question.label}</span>
              {question.required ? <span className={styles.requiredMark}>Obrigatória</span> : <span className={styles.optionalMark}>Opcional</span>}
            </label>
            {mayUseExplicitNotApplicable(question) ? (
              <div className={styles.fieldHelper}>
                <small>Se a pergunta não fizer parte da sua rotina, você pode registrar “Não se aplica”.</small>
                <button type="button" disabled={isPending || submitted} onClick={() => updateAnswer(question.key, "Não se aplica")}>Marcar não se aplica</button>
              </div>
            ) : null}
            {question.inputType === "text" ? (
              <Textarea
                aria-invalid={Boolean(showError)}
                aria-describedby={showError ? fieldId + "-error" : undefined}
                id={fieldId}
                disabled={isPending || submitted}
                maxLength={4000}
                name={question.key}
                onBlur={() => setTouchedKeys(previous => previous.includes(question.key) ? previous : [...previous, question.key])}
                onChange={(event) => updateAnswer(question.key, event.target.value)}
                required={question.required}
                rows={3}
                value={values[question.key] ?? ""}
              />
            ) : (
              <TextInput
                aria-invalid={Boolean(showError)}
                aria-describedby={showError ? fieldId + "-error" : undefined}
                id={fieldId}
                disabled={isPending || submitted}
                max={question.inputType === "rating_0_10" ? 10 : undefined}
                min={0}
                name={question.key}
                onBlur={() => setTouchedKeys(previous => previous.includes(question.key) ? previous : [...previous, question.key])}
                onChange={(event) => updateAnswer(question.key, event.target.value)}
                required={question.required}
                step={1}
                type="number"
                inputMode="numeric"
                value={values[question.key] ?? ""}
              />
            )}
            {showError ? <small id={fieldId + "-error"} role="alert" className={styles.fieldError}>{error}</small> : null}
            {question.inputType === "text" ? <small className={styles.fieldMeta}>{(values[question.key] ?? "").length} / 4000 caracteres</small> : null}
          </div>
        );
      })}
      {dirty && !isPending ? (
        <p aria-live="polite" className={styles.meta}>
          Alterações ainda não salvas. Salve o rascunho antes de sair.
        </p>
      ) : null}
      {newerServerSnapshot ? (
        <section className={styles.conflictPanel} aria-label="Conferir alterações entre sessões">
          <h3>Há outra versão salva deste rascunho</h3>
          <p>Suas respostas digitadas nesta aba continuam aqui. Os campos que você não modificou usarão a versão salva. Os campos editados nas duas sessões precisam de sua escolha.</p>
          <p>{differences.filter((item) => item.savedChanged).length} campo(s) alterado(s) em outra sessão; {overlapping.length} com respostas diferentes nas duas versões.</p>
          {overlapping.map((difference) => {
            const question = questions.find((entry) => entry.key === difference.key);
            return (
              <fieldset className={styles.conflictField} key={difference.key}>
                <legend>{question?.label ?? "Resposta em conflito"}</legend>
                <p><strong>Minha edição:</strong> <span className={styles.conflictAnswer}>{values[difference.key] || "Sem resposta"}</span></p>
                <p><strong>Versão salva:</strong> <span className={styles.conflictAnswer}>{initialValues[difference.key] || "Sem resposta"}</span></p>
                <label>
                  <input
                    checked={collisionChoices[difference.key] === "mine"}
                    name={"conflict-" + feedbackId + "-" + difference.key}
                    onChange={() => setCollisionChoices((previous) => ({ ...previous, [difference.key]: "mine" }))}
                    type="radio"
                    value="mine"
                  />
                  Manter minha edição
                </label>
                <label>
                  <input
                    checked={collisionChoices[difference.key] === "saved"}
                    name={"conflict-" + feedbackId + "-" + difference.key}
                    onChange={() => setCollisionChoices((previous) => ({ ...previous, [difference.key]: "saved" }))}
                    type="radio"
                    value="saved"
                  />
                  Usar a versão salva
                </label>
              </fieldset>
            );
          })}
          <Button disabled={isPending || missingChoices} onClick={combineAfterReview} type="button" variant="secondary">
            Combinar respostas para continuar
          </Button>
          {missingChoices ? <p role="status">Escolha qual resposta manter em cada pergunta alterada nas duas sessões.</p> : null}
          <p>A combinação é feita apenas nesta tela. Para gravar, você ainda precisa salvar o rascunho ou confirmar o envio definitivo. Uma nova mudança simultânea continuará protegida pelo bloqueio de concorrência.</p>
        </section>
      ) : null}
      {reviewOpen && !submitted ? (
        <section className={styles.reviewPanel} aria-label="Revisão antes do envio">
          <h3>Revise antes de enviar</h3>
          <p>As respostas enviadas ficam registradas e não poderão ser alteradas por esta tela.</p>
          <dl className={styles.answers}>
            {questions.map(question => (
              <div key={question.key}>
                <dt>{question.label}</dt>
                <dd>{values[question.key]?.trim() || "Sem resposta"}</dd>
              </div>
            ))}
          </dl>
          <Button type="button" variant="secondary" onClick={() => setReviewOpen(false)}>Voltar e editar</Button>
        </section>
      ) : null}
      <ClientWeeklyFeedbackSubmitControls
        blocked={newerServerSnapshot}
        completed={submitted}
        reviewing={reviewOpen}
        onBeforeSubmit={prepareSubmit}
      />
      {state.outcome === "conflict" && !newerServerSnapshot && !mergedAfterConflict ? (
        <div className={styles.conflictPrompt}>
          <p>Se ainda houver rascunho pendente, suas edições serão mantidas nesta tela ao conferir a versão salva. Se outra sessão já enviou o feedback definitivamente, a edição poderá ser encerrada.</p>
          <Button onClick={() => { setReviewOpen(false); router.refresh(); }} type="button" variant="secondary">
            Conferir versão salva
          </Button>
        </div>
      ) : null}
      {mergedAfterConflict ? (
        <p role="status" className={styles.meta}>
          Respostas combinadas nesta tela, mas ainda não salvas. Use Salvar rascunho ou confirme o envio.
        </p>
      ) : null}
    </form>
  );
}
