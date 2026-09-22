"use client";

import { useActionState } from "react";

import {
  type ProtocolLifecycleOperation,
  type ProtocolLifecycleState,
  runProtocolLifecycleAction,
} from "@/app/admin/protocolos/[protocoloId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./ProtocolLifecycleAction.module.css";

const initialState: ProtocolLifecycleState = {
  message: null,
  success: false,
};

type ProtocolLifecycleActionProps = {
  operation: ProtocolLifecycleOperation;
  protocolId: string;
  versionId: string;
};

const actionContent: Record<
  ProtocolLifecycleOperation,
  {
    button: string;
    description: string;
    title: string;
  }
> = {
  approve: {
    button: "Aprovar versão",
    description:
      "Registra a aprovação humana desta versão já submetida. Aprovar não publica para a cliente.",
    title: "Aprovação humana",
  },
  publish: {
    button: "Publicar para a cliente",
    description:
      "Publica exatamente esta versão já aprovada. A publicação ficará registrada no histórico.",
    title: "Publicação",
  },
  submit: {
    button: "Submeter para revisão",
    description:
      "Ao submeter, esta versão e sua estrutura alimentar ficam congeladas para alterações.",
    title: "Revisão",
  },
};

export function ProtocolLifecycleAction({
  operation,
  protocolId,
  versionId,
}: ProtocolLifecycleActionProps) {
  const action = runProtocolLifecycleAction.bind(
    null,
    protocolId,
    versionId,
    operation,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const content = actionContent[operation];

  return (
    <form action={formAction} className={styles.form}>
      <div>
        <h4 className={styles.title}>{content.title}</h4>
        <p className={styles.description}>{content.description}</p>
      </div>

      {operation === "publish" ? (
        <label className={styles.confirmation}>
          <input name="confirmPublication" required type="checkbox" value="yes" />
          <span>
            Confirmo que esta versão aprovada deve ficar disponível para a
            cliente.
          </span>
        </label>
      ) : null}

      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Ação concluída" : "Ação não concluída"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <Button loading={isPending} type="submit">
        {content.button}
      </Button>
    </form>
  );
}
