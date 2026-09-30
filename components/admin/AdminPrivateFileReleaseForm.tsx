"use client";

import { useActionState } from "react";

import {
  type AdminPrivateFileReleaseState,
  releaseAdminPrivateFileToClientAction,
} from "@/app/admin/clientes/[clienteId]/arquivos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "./AdminPrivateFileReleaseForm.module.css";

const initialState: AdminPrivateFileReleaseState = {
  message: null,
  success: false,
};

type AdminPrivateFileReleaseFormProps = {
  clientId: string;
  fileId: string;
};

export function AdminPrivateFileReleaseForm({
  clientId,
  fileId,
}: AdminPrivateFileReleaseFormProps) {
  const action = releaseAdminPrivateFileToClientAction.bind(
    null,
    clientId,
    fileId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={
            state.success
              ? "Visibilidade atualizada"
              : "Não foi possível liberar"
          }
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <label className={styles.confirmation}>
        <input name="confirmRelease" required type="checkbox" value="yes" />
        <span>Confirme que este arquivo pode ficar visível para a cliente.</span>
      </label>

      <Button loading={isPending} type="submit" variant="secondary">
        Liberar para cliente
      </Button>
    </form>
  );
}
