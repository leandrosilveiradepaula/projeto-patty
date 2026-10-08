"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  type WeeklyFeedbackRequestFormState,
  createWeeklyFeedbackRequestAction,
} from "@/app/admin/clientes/[clienteId]/feedback-semanal/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./AdminWeeklyFeedbackRequestForm.module.css";

const initialState: WeeklyFeedbackRequestFormState = {
  message: null,
  success: false,
};

export function AdminWeeklyFeedbackRequestForm({
  clientId,
  eligible,
}: {
  clientId: string;
  eligible: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = createWeeklyFeedbackRequestAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Feedback solicitado" : "Não foi possível solicitar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <label className={styles.field}>
        <span>Semana de referência · início</span>
        <TextInput name="periodStart" required type="date" />
      </label>
      <label className={styles.field}>
        <span>Semana de referência · fim</span>
        <TextInput name="periodEnd" required type="date" />
      </label>
      <label className={styles.field}>
        <span>Prazo para resposta (opcional)</span>
        <TextInput name="dueAt" type="datetime-local" />
      </label>
      <Button disabled={!eligible} loading={isPending} type="submit">
        {eligible ? "Criar solicitação" : "Aguardando primeiro protocolo"}
      </Button>
    </form>
  );
}
