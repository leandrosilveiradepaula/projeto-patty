"use client";

import { useActionState } from "react";

import {
  cloneProtocolVersionDraft,
  type ProtocolLifecycleFormState,
} from "@/app/admin/protocolos/[protocoloId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./ProtocolCloneVersionAction.module.css";

const initialState: ProtocolLifecycleFormState = {
  message: null,
  success: false,
};

type ProtocolCloneVersionActionProps = {
  protocolId: string;
  sourceProtocolVersionId: string;
  sourceVersionNumber: number;
};

export function ProtocolCloneVersionAction({
  protocolId,
  sourceProtocolVersionId,
  sourceVersionNumber,
}: ProtocolCloneVersionActionProps) {
  const action = cloneProtocolVersionDraft.bind(
    null,
    protocolId,
    sourceProtocolVersionId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={
            state.success
              ? "Novo rascunho criado"
              : "Não foi possível criar o rascunho"
          }
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <p className={styles.description}>
        Cria uma nova versão em rascunho baseada na versão {sourceVersionNumber},
        copiando o plano alimentar, variantes, refeições, doses e ciclos
        persistidos. Aprovação e publicação não são copiadas.
      </p>
      <Button loading={isPending} type="submit" variant="secondary">
        Criar novo rascunho a partir desta versão
      </Button>
    </form>
  );
}
