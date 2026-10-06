"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  type ClientAnamnesisDraftAnswerFormState,
  saveClientAnamnesisDraftTextAnswer,
} from "@/app/cliente/anamnese/[anamneseId]/actions";
import { Alert } from "@/components/ui/Alert";
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

  useEffect(() => {
    if (!state.success || pendingValueRef.current === null) {
      return;
    }

    lastSavedValueRef.current = pendingValueRef.current;
    pendingValueRef.current = null;
  }, [state.success]);

  function saveIfChanged() {
    if (isPending || value === lastSavedValueRef.current) {
      return;
    }

    pendingValueRef.current = value;
    formRef.current?.requestSubmit();
  }

  const saved = state.success && value === lastSavedValueRef.current;

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      {state.message && !state.success ? (
        <Alert
          live="assertive"
          title="Não foi possível salvar"
          variant="critical"
        >
          {state.message} Toque no campo e saia dele novamente para tentar salvar.
        </Alert>
      ) : null}
      <FormField
        description="Esta resposta é salva automaticamente quando você sai do campo. Você pode fechar o aplicativo e continuar depois."
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
      <p aria-live="polite" className={styles.saveStatus}>
        {isPending
          ? "Salvando..."
          : saved
            ? "Salvo automaticamente."
            : value === lastSavedValueRef.current
              ? "Resposta salva."
              : "A resposta será salva ao sair do campo."}
      </p>
    </form>
  );
}
