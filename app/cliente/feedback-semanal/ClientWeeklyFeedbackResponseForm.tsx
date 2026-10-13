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
  const [editedSinceLastSave, setEditedSinceLastSave] = useState(false);
  const [attemptedFinalSubmit, setAttemptedFinalSubmit] = useState(false);
  const [touchedKeys, setTouchedKeys] = useState<string[]>([]);
  const firstInvalid = firstInvalidWeeklyFeedbackField(questions, values, attemptedFinalSubmit);
  const progress = summarizeWeeklyFeedbackRequiredProgress(questions, values);
  const inFlightRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const router = useRouter();
  const submitted = state.outcome === "submitted";
  const dirty = editedSinceLastSave && !submitted;

  useEffect(() => {
    inFlightRef.current = false;
    if (state.outcome === "draft-saved" || state.outcome === "submitted") {
      setEditedSinceLastSave(false);
      router.refresh();
    }
  }, [state, router]);

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
    if (intent === "submit") {
      setAttemptedFinalSubmit(true);
      const invalid = firstInvalidWeeklyFeedbackField(questions, values, true);
      if (invalid) {
        setReviewOpen(false);
        document.getElementById("weekly-feedback-answer-" + invalid)?.focus();
        return false;
      }
    } else {
      const invalid = firstInvalidWeeklyFeedbackField(questions, values, false);
      if (invalid) {
        document.getElementById("weekly-feedback-answer-" + invalid)?.focus();
        return false;
      }
    }
    if (intent === "submit" && !reviewOpen) {
      setReviewOpen(true);
      return false;
    }
    return true;
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
        if (inFlightRef.current || isPending || submitted) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
    >
      <input type="hidden" name="expectedFingerprint" value={expectedFingerprint} />
      <div className={styles.formProgress} role="status" aria-live="polite">
        <span className={styles.fieldMeta}>Etapa 1 de 2 · Preencher e revisar</span>
        <strong>{progress.requiredCompleted} de {progress.required} perguntas obrigatórias preenchidas</strong>
        <span>{progress.completed} de {progress.total} respostas iniciadas</span>
        <progress max={progress.required || 1} value={progress.requiredCompleted} aria-label="Progresso do preenchimento obrigatório" />
        {progress.firstMissingRequired ? <button type="button" className={styles.jumpLink} onClick={() => document.getElementById("weekly-feedback-answer-" + progress.firstMissingRequired)?.focus()}>Ir para primeira obrigatória pendente</button> : <span>Obrigatórias preenchidas. Revise e envie quando estiver pronta.</span>}
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
        const fieldId = "weekly-feedback-answer-" + question.key;
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
      <ClientWeeklyFeedbackSubmitControls completed={submitted} onBeforeSubmit={prepareSubmit} />
      {state.outcome === "conflict" ? (
        <Button onClick={() => router.refresh()} type="button" variant="secondary">
          Conferir situação atual
        </Button>
      ) : null}
    </form>
  );
}
