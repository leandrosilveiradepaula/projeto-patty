"use client";

import { useActionState } from "react";

import {
  type ManualRecoveryLinkState,
  generateManualRecoveryLinkAction,
} from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "./AdminClientRecoveryLinkForm.module.css";

const initialState: ManualRecoveryLinkState = {
  message: null,
  recoveryLink: null,
  success: false,
};

export function AdminClientRecoveryLinkForm({
  clientId,
}: {
  clientId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    generateManualRecoveryLinkAction.bind(null, clientId),
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live="polite"
          title={state.success ? "Link gerado" : "Não foi possível gerar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <Button loading={isPending} type="submit">
        Gerar link de recuperação
      </Button>

      {state.recoveryLink ? (
        <div className={styles.panel}>
          <label className={styles.label} htmlFor="client-recovery-link">
            Link individual de recuperação
          </label>
          <textarea
            className={styles.value}
            id="client-recovery-link"
            readOnly
            rows={4}
            value={state.recoveryLink}
          />
          <p className={styles.note}>
            Envie este link somente para esta cliente. Ele concede uma sessão
            temporária de recuperação para definição de uma nova senha.
          </p>
        </div>
      ) : null}
    </form>
  );
}
