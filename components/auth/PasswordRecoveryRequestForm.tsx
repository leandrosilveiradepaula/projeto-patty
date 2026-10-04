"use client";

import { useActionState } from "react";

import {
  type PasswordRecoveryRequestState,
  requestPasswordRecovery,
} from "@/app/recuperar-senha/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./PasswordRecoveryRequestForm.module.css";

const initialState: PasswordRecoveryRequestState = {
  message: null,
  success: false,
};

export function PasswordRecoveryRequestForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordRecovery,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <Alert
          live="polite"
          title={state.success ? "Confira seu email" : "Não foi possível continuar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <FormField id="recovery-email" label="Email" required>
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
        Enviar link de recuperação
      </Button>
    </form>
  );
}
