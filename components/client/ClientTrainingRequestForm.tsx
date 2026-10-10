"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const inFlightRef = useRef(false);
  const [allowNext, setAllowNext] = useState(false);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    requestTrainingAction,
    initialState,
  );

  useEffect(() => {
    inFlightRef.current = false;
    if (state.success) {
      setAllowNext(false);
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} aria-busy={isPending} className={styles.form} onSubmit={(event) => {
        if (inFlightRef.current || isPending || (state.success && !allowNext)) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }} ref={formRef}>
      {state.message && (!state.success || !allowNext) ? (
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
            disabled={isPending || (state.success && !allowNext)}
            maxLength={1000}
            name="note"
            placeholder="Se quiser, conte algo importante sobre sua solicitação."
            rows={4}
          />
        )}
      </FormField>

      <Button disabled={isPending || (state.success && !allowNext)} loading={isPending} type="submit">
        Solicitar treino
      </Button>
      {state.success && !allowNext ? (
        <Button onClick={() => setAllowNext(true)} type="button" variant="secondary">
          Registrar outra solicitação
        </Button>
      ) : null}
    </form>
  );
}
