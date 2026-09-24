"use client";

import { useActionState } from "react";

import {
  type ClientAnamnesisSubmitFormState,
  submitClientAnamnesis,
} from "@/app/cliente/anamnese/[anamneseId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./ClientAnamnesisSubmitForm.module.css";

const initialState: ClientAnamnesisSubmitFormState = {
  message: null,
  success: false,
};

type ClientAnamnesisSubmitFormProps = {
  submissionId: string;
};

export function ClientAnamnesisSubmitForm({
  submissionId,
}: ClientAnamnesisSubmitFormProps) {
  const action = submitClientAnamnesis.bind(null, submissionId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Anamnese enviada" : "Ainda não foi possível enviar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <p className={styles.notice}>
        Antes de enviar, confira as respostas. Após o envio, suas respostas
        originais ficam preservadas e não poderão mais ser editadas por você.
      </p>
      <Button loading={isPending} type="submit">
        Enviar Anamnese
      </Button>
    </form>
  );
}
