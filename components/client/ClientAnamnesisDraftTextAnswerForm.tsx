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
  required: boolean;
  submissionId: string;
};

export function ClientAnamnesisDraftTextAnswerForm({
  initialValue,
  label,
  questionId,
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
      return;
    }

    if (state.message) {
      failedValueRef.current = pendingValueRef.current;
      pendingValueRef.current = null;
    }
  }, [state]);

  function saveIfChanged() {
    if (
      isPending ||
      pendingValueRef.current !== null ||
      value === lastSavedValueRef.current
    ) {
      return;
    }

    pendingValueRef.current = value;
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    if (
      isPending ||
      pendingValueRef.current !== null ||
      value === lastSavedValueRef.current ||
      value === failedValueRef.current
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      pendingValueRef.current = value;
      formRef.current?.requestSubmit();
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [isPending, state, value]);

  const saved = state.success && value === lastSavedValueRef.current;

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
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
      {state.message && !state.success && value !== lastSavedValueRef.current ? (
        <Button disabled={isPending || pendingValueRef.current !== null} onClick={saveIfChanged} size="compact" type="button" variant="secondary">
          Tentar salvar novamente
        </Button>
      ) : null}
      <p aria-live="polite" className={styles.saveStatus}>
        {isPending
          ? "Salvando..."
          : saved
            ? "Salvo automaticamente."
            : value === lastSavedValueRef.current
              ? "Resposta salva."
              : state.message && !state.success
                ? "Não salvo. Sua resposta ainda está no campo."
                : "Alterações não salvas. A resposta será salva após uma pausa ou ao sair do campo."}
      </p>
    </form>
  );
}
