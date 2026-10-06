"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  type ClientAnamnesisDraftAnswerFormState,
  saveClientAnamnesisDraftSingleChoiceAnswer,
} from "@/app/cliente/anamnese/[anamneseId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./ClientAnamnesisDraftSingleChoiceAnswerForm.module.css";

const initialState: ClientAnamnesisDraftAnswerFormState = {
  message: null,
  success: false,
};

type ClientAnamnesisDraftSingleChoiceAnswerFormProps = {
  initialValue: string | null;
  label: string;
  options: string[];
  questionId: string;
  reloadPageOnSuccess?: boolean;
  required: boolean;
  submissionId: string;
};

export function ClientAnamnesisDraftSingleChoiceAnswerForm({
  initialValue,
  label,
  options,
  questionId,
  reloadPageOnSuccess = false,
  required,
  submissionId,
}: ClientAnamnesisDraftSingleChoiceAnswerFormProps) {
  const action = saveClientAnamnesisDraftSingleChoiceAnswer.bind(
    null,
    submissionId,
    questionId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const lastSavedValueRef = useRef(initialValue);
  const pendingValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.success || pendingValueRef.current === null) {
      return;
    }

    lastSavedValueRef.current = pendingValueRef.current;
    pendingValueRef.current = null;

    if (state.success && reloadPageOnSuccess) {
      window.location.assign(`/cliente/anamnese/${submissionId}`);
    }
  }, [reloadPageOnSuccess, state.success, submissionId]);

  function saveValue(value: string) {
    if (isPending || value === lastSavedValueRef.current) {
      return;
    }

    pendingValueRef.current = value;
    formRef.current?.requestSubmit();
  }

  function retrySelectedValue() {
    const selected = formRef.current
      ? new FormData(formRef.current).get("answerValue")
      : null;

    if (typeof selected !== "string") {
      return;
    }

    pendingValueRef.current = selected;
    formRef.current?.requestSubmit();
  }

  const descriptionId = `anamnesis-draft-choice-${questionId}-description`;

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      {state.message && !state.success ? (
        <Alert
          live="assertive"
          title="Não foi possível salvar"
          variant="critical"
        >
          {state.message}
        </Alert>
      ) : null}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          <span>{label}</span>
          {required ? (
            <span className={styles.required} aria-label="obrigatorio">
              *
            </span>
          ) : null}
        </legend>
        <p className={styles.description} id={descriptionId}>
          Ao selecionar uma opção, a resposta é salva automaticamente. Você pode
          continuar o restante em outro momento.
        </p>
        <div
          aria-describedby={descriptionId}
          className={styles.optionList}
          role="radiogroup"
        >
          {options.map((option, index) => {
            const optionId = `anamnesis-draft-choice-${questionId}-${index}`;

            return (
              <label className={styles.option} htmlFor={optionId} key={option}>
                <input
                  defaultChecked={initialValue === option}
                  id={optionId}
                  name="answerValue"
                  onChange={(event) => {
                    if (event.currentTarget.checked) {
                      saveValue(event.currentTarget.value);
                    }
                  }}
                  type="radio"
                  value={option}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className={styles.statusRow}>
        <p aria-live="polite" className={styles.saveStatus}>
          {isPending
            ? "Salvando..."
            : state.success
              ? "Salvo automaticamente."
              : "Selecione uma opção para salvar."}
        </p>
        {state.message && !state.success ? (
          <Button
            loading={isPending}
            onClick={retrySelectedValue}
            size="compact"
            type="button"
          >
            Tentar salvar novamente
          </Button>
        ) : null}
      </div>
    </form>
  );
}
