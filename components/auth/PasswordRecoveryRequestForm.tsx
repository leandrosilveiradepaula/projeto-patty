"use client";

import Link from "next/link";
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

  if (state.success) {
    return (
      <div className={styles.successState}>
        <Alert live="polite" title="Email enviado" variant="success">
          {state.message ??
            "Se este email estiver cadastrado, você receberá um link para redefinir sua senha."}
        </Alert>
        <p className={styles.successHelp}>
          Abra sua caixa de entrada e clique no link de recuperação para
          continuar. Você não precisa informar o email novamente nesta tela.
        </p>
        <Link className={styles.retryLink} href="/recuperar-senha">
          Solicitar outro link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <Alert
          live="assertive"
          title="Não foi possível continuar"
          variant="critical"
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
