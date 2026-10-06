"use client";

import { useActionState } from "react";

import {
  type AnamnesisClarificationResolutionFormState,
  resolveAnamnesisClarificationRequest,
} from "@/app/admin/anamneses/[anamneseId]/esclarecimentos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "./AdminAnamnesisClarificationResolutionForm.module.css";

const initialState: AnamnesisClarificationResolutionFormState = {
  message: null,
  success: false,
};

export function AdminAnamnesisClarificationResolutionForm({
  requestId,
  submissionId,
}: {
  requestId: string;
  submissionId: string;
}) {
  const action = resolveAnamnesisClarificationRequest.bind(
    null,
    submissionId,
    requestId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Pedido resolvido" : "Não foi possível resolver"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      {!state.success ? (
        <Button loading={isPending} type="submit" variant="secondary">
          Marcar como resolvido
        </Button>
      ) : null}
    </form>
  );
}
