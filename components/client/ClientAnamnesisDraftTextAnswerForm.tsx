"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    if (!isPending && state.success) {
      router.refresh();
    }
  }, [isPending, router, state.success]);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Rascunho salvo" : "Não foi possível salvar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <FormField
        description="Você pode salvar esta resposta e continuar o restante em outro momento. Quando terminar todos os campos aplicáveis, use a seção de finalização para enviar a Anamnese."
        id={`anamnesis-draft-answer-${questionId}`}
        label={label}
        required={required}
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            defaultValue={initialValue}
            name="answerValue"
            rows={5}
          />
        )}
      </FormField>
      <div className={styles.actions}>
        <Button loading={isPending} size="compact" type="submit">
          Salvar no rascunho
        </Button>
      </div>
    </form>
  );
}
