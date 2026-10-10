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
import type { WeeklyFeedbackQuestion } from "@/lib/weekly-feedback/definition";

import styles from "./page.module.css";

const initialState: WeeklyFeedbackSaveFormState = {
  message: null,
  outcome: "idle",
};

type Props = {
  feedbackId: string;
  initialValues: Record<string, string>;
  questions: WeeklyFeedbackQuestion[];
};

export function ClientWeeklyFeedbackResponseForm({
  feedbackId,
  initialValues,
  questions,
}: Props) {
  const action = saveWeeklyFeedbackAction.bind(null, feedbackId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  // Controlled fields retain what the client typed after any failed action.
  // No health answers are copied to URLs, local storage or logs.
  const [values, setValues] = useState(initialValues);
  const [editedSinceLastSave, setEditedSinceLastSave] = useState(false);
  const inFlightRef = useRef(false);
  const router = useRouter();
  const submitted = state.outcome === "submitted";

  useEffect(() => {
    inFlightRef.current = false;
    if (state.outcome === "draft-saved" || state.outcome === "submitted") {
      setEditedSinceLastSave(false);
      router.refresh();
    }
  }, [state, router]);

  function updateAnswer(key: string, next: string) {
    setValues((previous) => ({ ...previous, [key]: next }));
    setEditedSinceLastSave(true);
  }

  const confirmed = (state.outcome === "draft-saved" && !editedSinceLastSave) || submitted;
  const failed = state.outcome === "invalid" ||
    state.outcome === "conflict" ||
    state.outcome === "save-error" ||
    state.outcome === "unavailable";

  return (
    <form
      action={formAction}
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
      {state.message && (failed || confirmed) ? (
        <Alert
          live={failed ? "assertive" : "polite"}
          title={failed ? "Respostas ainda não salvas" : submitted ? "Feedback enviado" : "Rascunho salvo"}
          variant={failed ? "critical" : "success"}
        >
          {state.message}
        </Alert>
      ) : null}
      {questions.map((question) => (
        <label className={styles.field} key={question.key}>
          <span>{question.label}</span>
          {question.allowsNotApplicable ? (
            <small>Quando não se aplicar ao seu protocolo, escreva “Não se aplica”.</small>
          ) : null}
          {question.inputType === "text" ? (
            <Textarea
              disabled={isPending || submitted}
              maxLength={4000}
              name={question.key}
              onChange={(event) => updateAnswer(question.key, event.target.value)}
              required={question.required}
              rows={3}
              value={values[question.key] ?? ""}
            />
          ) : (
            <TextInput
              disabled={isPending || submitted}
              max={question.inputType === "rating_0_10" ? 10 : undefined}
              min={0}
              name={question.key}
              onChange={(event) => updateAnswer(question.key, event.target.value)}
              required={question.required}
              step={1}
              type="number"
              value={values[question.key] ?? ""}
            />
          )}
        </label>
      ))}
      {editedSinceLastSave && !isPending ? (
        <p aria-live="polite" className={styles.meta}>
          Alterações ainda não salvas. Salve o rascunho antes de sair.
        </p>
      ) : null}
      <ClientWeeklyFeedbackSubmitControls completed={submitted} />
      {state.outcome === "conflict" ? (
        <Button onClick={() => router.refresh()} type="button" variant="secondary">
          Conferir situação atual
        </Button>
      ) : null}
    </form>
  );
}
