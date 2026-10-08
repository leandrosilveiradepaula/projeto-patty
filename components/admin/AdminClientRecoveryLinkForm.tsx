"use client";

import { useActionState, useState } from "react";

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
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    generateManualRecoveryLinkAction.bind(null, clientId),
    initialState,
  );

  async function copyRecoveryLink() {
    if (!state.recoveryLink) return;
    try {
      await navigator.clipboard.writeText(state.recoveryLink);
      setCopyStatus("Link copiado.");
    } catch {
      setCopyStatus("Não foi possível copiar automaticamente. Selecione o link acima e copie manualmente.");
    }
  }

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
            Link individual de recuperação — acesso sensível
          </label>
          <textarea
            className={styles.value}
            id="client-recovery-link"
            readOnly
            rows={4}
            value={state.recoveryLink}
          />
          <Button onClick={copyRecoveryLink} type="button" variant="secondary">Copiar link</Button>
          {copyStatus ? <p aria-live="polite">{copyStatus}</p> : null}
          <p className={styles.note}>
            Envie este link somente para esta cliente. Ele concede uma sessão
            temporária de recuperação para definição de uma nova senha. Copie antes de sair desta página; não salve o link em locais públicos ou compartilhe com terceiros.
          </p>
        </div>
      ) : null}
    </form>
  );
}
