"use client";

import { useActionState } from "react";

import {
  approveProtocolVersion,
  publishProtocolVersion,
  submitProtocolVersionForReview,
  type ProtocolLifecycleFormState,
} from "@/app/admin/protocolos/[protocoloId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./ProtocolLifecycleAction.module.css";

const initialState: ProtocolLifecycleFormState = {
  message: null,
  success: false,
};

type ProtocolLifecycleActionKind = "approve" | "publish" | "submit";

type ProtocolLifecycleActionProps = {
  kind: ProtocolLifecycleActionKind;
  protocolId: string;
  protocolVersionId: string;
};

const contentByKind: Record<
  ProtocolLifecycleActionKind,
  {
    button: string;
    confirmation: string;
    confirmationName: string;
    description: string;
    errorTitle: string;
    successTitle: string;
  }
> = {
  submit: {
    button: "Submeter para revisão",
    confirmation:
      "Confirmo que terminei a edição desta versão e quero congelá-la para revisão.",
    confirmationName: "confirmSubmission",
    description:
      "Após a submissão, esta versão fica congelada para edição. Revise a estrutura persistida antes de continuar.",
    errorTitle: "Não foi possível submeter",
    successTitle: "Versão submetida",
  },
  approve: {
    button: "Aprovar versão",
    confirmation:
      "Revisei esta versão e quero registrar minha aprovação profissional.",
    confirmationName: "confirmApproval",
    description:
      "Registra a aprovação humana desta versão submetida. A aprovação não publica automaticamente.",
    errorTitle: "Não foi possível aprovar",
    successTitle: "Versão aprovada",
  },
  publish: {
    button: "Publicar para a cliente",
    confirmation:
      "Confirme que esta é a versão revisada que deve ficar visível para a cliente.",
    confirmationName: "confirmPublication",
    description:
      "Publica exatamente esta versão já aprovada. A cliente passa a visualizar somente o artefato publicado.",
    errorTitle: "Não foi possível publicar",
    successTitle: "Versão publicada",
  },
};

export function ProtocolLifecycleAction({
  kind,
  protocolId,
  protocolVersionId,
}: ProtocolLifecycleActionProps) {
  const action =
    kind === "submit"
      ? submitProtocolVersionForReview.bind(
          null,
          protocolId,
          protocolVersionId,
        )
      : kind === "approve"
        ? approveProtocolVersion.bind(null, protocolId, protocolVersionId)
        : publishProtocolVersion.bind(null, protocolId, protocolVersionId);

  const [state, formAction, isPending] = useActionState(action, initialState);
  const content = contentByKind[kind];

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? content.successTitle : content.errorTitle}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <p className={styles.description}>{content.description}</p>
      <label className={styles.confirmation}>
        <input
          name={content.confirmationName}
          required
          type="checkbox"
          value="yes"
        />
        <span>{content.confirmation}</span>
      </label>
      <Button loading={isPending} type="submit">
        {content.button}
      </Button>
    </form>
  );
}
