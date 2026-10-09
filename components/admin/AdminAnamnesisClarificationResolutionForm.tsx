"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [confirmResolve, setConfirmResolve] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

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
      {!state.success && !confirmResolve ? (
        <Button onClick={() => setConfirmResolve(true)} type="button" variant="secondary">
          Marcar como resolvido
        </Button>
      ) : null}
      {!state.success && confirmResolve ? (
        <>
          <p>Confirma que revisou este pedido e deseja marcá-lo como resolvido? A resposta original permanece preservada.</p>
          <div className={styles.actions}>
            <Button disabled={isPending} onClick={() => setConfirmResolve(false)} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button loading={isPending} type="submit" variant="secondary">
              Confirmar resolução
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}
