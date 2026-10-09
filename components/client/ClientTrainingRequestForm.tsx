"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  type ClientTrainingRequestFormState,
  requestTrainingAction,
} from "@/app/cliente/treino/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";

import styles from "@/app/cliente/treino/page.module.css";

const initialState: ClientTrainingRequestFormState = {
  message: null,
  success: false,
};

export function ClientTrainingRequestForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    requestTrainingAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Solicitação enviada" : "Não foi possível enviar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Opcional. Use este campo para registrar algo importante sobre a solicitação."
        id="client-training-request-note"
        label="Observação"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            maxLength={1000}
            name="note"
            placeholder="Se quiser, conte algo importante sobre sua solicitação."
            rows={4}
          />
        )}
      </FormField>

      <Button loading={isPending} type="submit">
        Solicitar treino
      </Button>
    </form>
  );
}
