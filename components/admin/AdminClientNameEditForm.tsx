"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type AdminClientDisplayNameFormState,
  updateAdminClientDisplayNameAction,
} from "@/app/admin/clientes/[clienteId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./AdminClientRegistrationEditForm.module.css";

const initialState: AdminClientDisplayNameFormState = {
  message: null,
  success: false,
};

type AdminClientNameEditFormProps = {
  clientId: string;
  displayName?: string;
};

export function AdminClientNameEditForm({
  clientId,
  displayName,
}: AdminClientNameEditFormProps) {
  const action = updateAdminClientDisplayNameAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const inFlightRef = useRef(false);
  const [editedSinceResult, setEditedSinceResult] = useState(false);
  const router = useRouter();

  useEffect(() => {
    inFlightRef.current = false;
    if (state.success) {
      setEditedSinceResult(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onChange={() => setEditedSinceResult(true)}
      onSubmit={(event) => {
        if (inFlightRef.current || isPending) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
    >
      {state.message && !editedSinceResult ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Nome atualizado" : "Não foi possível atualizar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Obrigatório para identificar a cliente no cadastro profissional. Não altera o email ou as credenciais de login."
        id="admin-client-display-name"
        label="Nome da cliente"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="name"
            disabled={isPending}
              defaultValue={displayName}
            maxLength={120}
            name="displayName"
            required
            type="text"
          />
        )}
      </FormField>

      <Button disabled={isPending} loading={isPending} type="submit">
        Salvar nome
      </Button>
    </form>
  );
}
