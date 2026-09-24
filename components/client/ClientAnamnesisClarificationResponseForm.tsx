"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  type AnamnesisClarificationResponseFormState,
  respondToAnamnesisClarification,
} from "@/app/cliente/anamnese/[anamneseId]/esclarecimentos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import styles from "./AnamnesisClarificationForm.module.css";

const initialState: AnamnesisClarificationResponseFormState = { message: null, success: false };

export function ClientAnamnesisClarificationResponseForm({
  requestId,
  submissionId,
}: {
  requestId: string;
  submissionId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = respondToAnamnesisClarification.bind(null, submissionId, requestId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Complemento registrado" : "Não foi possível registrar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <FormField
        description="Seu complemento será preservado separadamente da resposta original."
        id={`clarification-response-${requestId}`}
        label="Seu esclarecimento"
        required
      >
        {(fieldProps) => (
          <Textarea {...fieldProps} name="responseText" placeholder="Digite a informação complementar solicitada." required rows={4} />
        )}
      </FormField>
      <div className={styles.actions}>
        <Button loading={isPending} size="compact" type="submit">Registrar esclarecimento</Button>
      </div>
    </form>
  );
}
