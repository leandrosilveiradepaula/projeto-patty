"use client";

import { useActionState } from "react";

import {
  type InviteClientState,
  inviteClient,
} from "@/app/admin/clientes/nova/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./ClientInviteForm.module.css";

const initialState: InviteClientState = { message: null };

export function ClientInviteForm() {
  const [state, formAction, isPending] = useActionState(
    inviteClient,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <Alert
          live="assertive"
          title="Convite não enviado"
          variant="critical"
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Esse endereço será usado como email de autenticação. O email de contato da cliente continua sendo um dado cadastral separado."
        id="client-invitation-email"
        label="Email da cliente"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="email"
            inputMode="email"
            name="email"
            required
            type="email"
          />
        )}
      </FormField>

      <Button loading={isPending} type="submit">
        Enviar convite
      </Button>
    </form>
  );
}
