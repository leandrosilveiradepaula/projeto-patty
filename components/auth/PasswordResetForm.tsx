"use client";

import { useActionState } from "react";

import {
  type PasswordResetState,
  resetPassword,
} from "@/app/redefinir-senha/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./PasswordResetForm.module.css";

const initialState: PasswordResetState = { message: null };

export function PasswordResetForm() {
  const [state, formAction, isPending] = useActionState(
    resetPassword,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <Alert live="assertive" title="Não foi possível redefinir" variant="critical">
          {state.message}
        </Alert>
      ) : null}
      <FormField id="new-password" label="Nova senha" required>
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="new-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        )}
      </FormField>
      <FormField id="new-password-confirmation" label="Confirmar nova senha" required>
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="new-password"
            minLength={8}
            name="passwordConfirmation"
            required
            type="password"
          />
        )}
      </FormField>
      <Button loading={isPending} type="submit">
        Salvar nova senha
      </Button>
    </form>
  );
}
