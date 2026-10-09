"use client";

import { useRef, useState } from "react";

import { endClientAssignmentAction } from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "@/app/admin/clientes/[clienteId]/page.module.css";

type AdminEndClientAssignmentFormProps = {
  clientId: string;
  displayName?: string;
};

export function AdminEndClientAssignmentForm({
  clientId,
  displayName,
}: AdminEndClientAssignmentFormProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false);
  const action = endClientAssignmentAction.bind(null, clientId);
  const clientLabel = displayName?.trim() || "esta cliente";

  return (
    <form
      action={action}
      className={styles.dangerForm}
      onSubmit={(event) => {
        if (inFlightRef.current) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
        setIsSubmitting(true);
      }}
    >
      <Alert title="O que acontece ao encerrar" variant="warning">
        <ul className={styles.assignmentConsequences}>
          <li>{clientLabel} será marcada como inativa.</li>
          <li>O acompanhamento e o acesso operacional atuais serão encerrados.</li>
          <li>Histórico, avaliações, protocolos, treinos, arquivos e demais registros serão preservados.</li>
          <li>A conta da cliente e seus dados não serão excluídos.</li>
        </ul>
      </Alert>

      <label className={styles.dangerConfirmation}>
        <input
          checked={confirmed}
          disabled={isSubmitting}
          name="confirmEndAssignment"
          onChange={(event) => setConfirmed(event.target.checked)}
          required
          type="checkbox"
          value="yes"
        />
        <span>
          Confirmo que quero encerrar o acompanhamento atual e tornar esta
          cliente inativa.
        </span>
      </label>

      <Button
        disabled={!confirmed || isSubmitting}
        loading={isSubmitting}
        type="submit"
        variant="danger"
      >
        Encerrar e marcar como inativa
      </Button>
    </form>
  );
}
