"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  type ClientAnamnesisDraftAnswerFormState,
  saveClientAnamnesisDraftTextAnswer,
} from "@/app/cliente/anamnese/[anamneseId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import styles from "./ClientAnamnesisDraftTextAnswerForm.module.css";

const initialState: ClientAnamnesisDraftAnswerFormState = {
  message: null,
  success: false,
};

type ClientAnamnesisDraftTextAnswerFormProps = {
  initialValue: string;
  label: string;
  questionId: string;
  initialAnswerExists: boolean;
  required: boolean;
  submissionId: string;
};

export function ClientAnamnesisDraftTextAnswerForm({
  initialValue,
  label,
  questionId,
  initialAnswerExists,
  required,
  submissionId,
}: ClientAnamnesisDraftTextAnswerFormProps) {
  const action = saveClientAnamnesisDraftTextAnswer.bind(
    null,
    submissionId,
    questionId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [value, setValue] = useState(initialValue);
  const formRef = useRef<HTMLFormElement>(null);
  // A successful server action must update React state, not only refs: the
  // saved indicator and the next optimistic concurrency expectation depend on it.
  const [persistedExists, setPersistedExists] = useState(initialAnswerExists);
  const [lastSavedValue, setLastSavedValue] = useState(initialValue);
  const [failedValue, setFailedValue] = useState<string | null>(null);
  const pendingValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingValueRef.current === null) {
      return;
    }

    if (state.success) {
      setLastSavedValue(pendingValueRef.current);
      setPersistedExists(true);
      setFailedValue(null);
      pendingValueRef.current = null;
      return;
    }

    if (state.message) {
      setFailedValue(pendingValueRef.current);
      pendingValueRef.current = null;
    }
  }, [state]);

  function saveIfChanged() {
    if (
      isPending ||
      pendingValueRef.current !== null ||
      value === lastSavedValue
    ) {
      return;
    }

    pendingValueRef.current = value;
    setFailedValue(null);
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    if (
      isPending ||
      pendingValueRef.current !== null ||
      value === lastSavedValue ||
      value === failedValue
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      pendingValueRef.current = value;
      formRef.current?.requestSubmit();
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [isPending, state, value, lastSavedValue, failedValue]);

  const saved = state.success && value === lastSavedValue;

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      <input name="expectedAnswerExists" type="hidden" value={persistedExists ? "1" : "0"} />
      <input name="expectedAnswerValue" type="hidden" value={persistedExists ? lastSavedValue : ""} />
      {state.message && !state.success ? (
        <Alert
          live="assertive"
          title="Não foi possível salvar"
          variant="critical"
        >
          {state.message} Sua resposta permanece neste campo. Você pode tentar salvar novamente sem redigitá-la.
        </Alert>
      ) : null}
      <FormField
        description="Esta resposta é salva automaticamente após uma breve pausa ou quando você sai do campo. Antes de fechar o aplicativo, confirme a mensagem de que a resposta foi salva."
        id={`anamnesis-draft-answer-${questionId}`}
        label={label}
        required={required}
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            name="answerValue"
            onBlur={saveIfChanged}
            onChange={(event) => setValue(event.target.value)}
            rows={5}
            value={value}
          />
        )}
      </FormField>
      {state.message && !state.success && value !== lastSavedValue ? (
        <Button disabled={isPending || pendingValueRef.current !== null} onClick={saveIfChanged} size="compact" type="button" variant="secondary">
          Tentar salvar novamente
        </Button>
      ) : null}
      <p aria-live="polite" className={styles.saveStatus}>
        {isPending
          ? "Salvando..."
          : saved
            ? "Salvo automaticamente."
            : value === lastSavedValue
              ? "Resposta salva."
              : state.message && !state.success
                ? "Não salvo. Sua resposta ainda está no campo."
                : "Alterações não salvas. A resposta será salva após uma pausa ou ao sair do campo."}
      </p>
    </form>
  );
}
