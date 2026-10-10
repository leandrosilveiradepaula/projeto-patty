"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
  fileName: string;
};

export function AdminPrivateFileReleaseForm({
  clientId,
  fileId,
  fileName,
}: AdminPrivateFileReleaseFormProps) {
  const action = releaseAdminPrivateFileToClientAction.bind(
    null,
    clientId,
    fileId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();
  const inFlightRef = useRef(false);

  useEffect(() => {
    inFlightRef.current = false;
    if (state.success) router.refresh();
  }, [state, router]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        if (inFlightRef.current || isPending || state.success) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
    >
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
        <input disabled={isPending || state.success} name="confirmRelease" required type="checkbox" value="yes" />
        <span>Confirmo que o arquivo <strong>{fileName}</strong> pode ficar visível para esta cliente.</span>
      </label>

      <Button disabled={isPending || state.success} loading={isPending} type="submit" variant="secondary">
        Liberar para cliente
      </Button>
    </form>
  );
}
