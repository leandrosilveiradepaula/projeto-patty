"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const inFlightRef = useRef(false);
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const periodReversed = Boolean(periodStart && periodEnd && periodEnd < periodStart);
  const action = createWeeklyFeedbackRequestAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    inFlightRef.current = false;
    if (state.success) {
      formRef.current?.reset();
      setPeriodStart("");
      setPeriodEnd("");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        if (inFlightRef.current || isPending) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
      ref={formRef}
    >
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
        <TextInput
          disabled={isPending}
          name="periodStart"
          onChange={(event) => setPeriodStart(event.target.value)}
          required
          type="date"
          value={periodStart}
        />
      </label>
      <label className={styles.field}>
        <span>Semana de referência · fim</span>
        <TextInput
          min={periodStart || undefined}
          disabled={isPending}
          name="periodEnd"
          onChange={(event) => setPeriodEnd(event.target.value)}
          required
          type="date"
          value={periodEnd}
        />
      </label>
      <label className={styles.field}>
        <span>Prazo para resposta (opcional)</span>
        <TextInput disabled={isPending} name="dueAt" type="datetime-local" />
      </label>
      {periodReversed ? (
        <Alert live="polite" title="Revise o período" variant="critical">
          A data final não pode ser anterior à data inicial.
        </Alert>
      ) : null}
      <Button disabled={!eligible || periodReversed || isPending} loading={isPending} type="submit">
        {eligible ? "Criar solicitação" : "Aguardando primeiro protocolo"}
      </Button>
    </form>
  );
}
