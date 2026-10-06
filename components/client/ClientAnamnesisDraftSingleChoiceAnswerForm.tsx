"use client";

import { useActionState, useEffect, useRef, useState } from "react";

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
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const formRef = useRef<HTMLFormElement>(null);
  const lastSavedValueRef = useRef(initialValue);
  const pendingValueRef = useRef<string | null>(null);
  const failedValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingValueRef.current === null) {
      return;
    }

    if (state.success) {
      lastSavedValueRef.current = pendingValueRef.current;
      failedValueRef.current = null;
      pendingValueRef.current = null;

      if (state.success && reloadPageOnSuccess) {
        window.location.assign(`/cliente/anamnese/${submissionId}`);
      }
      return;
    }

    if (state.message) {
      failedValueRef.current = pendingValueRef.current;
      pendingValueRef.current = null;
    }
  }, [reloadPageOnSuccess, state, submissionId]);

  useEffect(() => {
    if (
      isPending ||
      pendingValueRef.current !== null ||
      selectedValue === null ||
      selectedValue === lastSavedValueRef.current ||
      selectedValue === failedValueRef.current
    ) {
      return;
    }

    pendingValueRef.current = selectedValue;
    formRef.current?.requestSubmit();
  }, [isPending, selectedValue, state]);

  function retrySelectedValue() {
    if (selectedValue === null || isPending) {
      return;
    }

    failedValueRef.current = null;
    pendingValueRef.current = selectedValue;
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
            <span className={styles.required} aria-label="obrigatório">
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
                  checked={selectedValue === option}
                  id={optionId}
                  name="answerValue"
                  onChange={(event) => {
                    if (event.currentTarget.checked) {
                      setSelectedValue(event.currentTarget.value);
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
