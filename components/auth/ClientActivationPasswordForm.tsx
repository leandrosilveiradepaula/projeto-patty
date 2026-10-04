"use client";

import { useActionState } from "react";

import {
  type ActivationPasswordState,
  setInitialClientPassword,
} from "@/app/ativar-conta/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";

import styles from "./ClientActivationPasswordForm.module.css";

const initialState: ActivationPasswordState = { message: null };

export function ClientActivationPasswordForm({ role }: { role: "admin" | "client" | null }) {
  const [state, formAction, isPending] = useActionState(
    setInitialClientPassword,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <Alert
          live="assertive"
          title="Não foi possível criar a senha"
          variant="critical"
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description={role === "admin" ? "Use pelo menos 8 caracteres. Depois, você configurará a autenticação em duas etapas obrigatória para a área administrativa." : "Use pelo menos 8 caracteres. Depois, você entrará normalmente com seu email e essa senha."}
        id="activation-password"
        label="Crie sua senha"
        required
      >
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

      <FormField
        id="activation-password-confirmation"
        label="Confirme sua senha"
        required
      >
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
        Criar senha e continuar
      </Button>
    </form>
  );
}
