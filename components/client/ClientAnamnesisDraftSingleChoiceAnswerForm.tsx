"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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

      if (reloadPageOnSuccess) {
        router.refresh();
      }
      return;
    }

    if (state.message) {
      failedValueRef.current = pendingValueRef.current;
      pendingValueRef.current = null;
    }
  }, [reloadPageOnSuccess, router, state]);

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
  const savedChoice = selectedValue !== null &&
    selectedValue === lastSavedValueRef.current;
  const unavailableHistoricalChoice = selectedValue !== null &&
    !options.includes(selectedValue);

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
        {unavailableHistoricalChoice ? (
          <Alert title="Resposta histórica indisponível" variant="info">
            A opção originalmente salva não está nesta versão disponível. Selecione uma das opções atuais para alterar a resposta, sem substituição automática.
          </Alert>
        ) : null}
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
                  disabled={isPending}
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
            : savedChoice
              ? "Resposta salva."
              : state.message && !state.success
                ? "Não salvo. Selecione novamente ou tente salvar."
                : "Alterações não salvas. Aguarde a confirmação antes de sair."}
        </p>
        {state.message && !state.success ? (
          <Button
            disabled={selectedValue === null || isPending}
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
