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

  if (state.success) {
    return (
      <div className={styles.successState}>
        <Alert live="polite" title="Solicitação recebida" variant="success">
          {state.message ??
            "Se este email estiver cadastrado, você receberá um link para redefinir sua senha."}
        </Alert>
        <p className={styles.successHelp}>
          Abra sua caixa de entrada e clique no link de recuperação para
          continuar. Você não precisa informar o email novamente nesta tela.
        </p>
        <a className={styles.retryLink} href="/recuperar-senha">
          Solicitar outro link
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} aria-busy={isPending} className={styles.form}>
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
            maxLength={254}
            name="email"
            disabled={isPending}
            required
            type="email"
          />
        )}
      </FormField>
      {isPending ? <p role="status">Aguarde a confirmação antes de tentar novamente.</p> : null}
      <Button loading={isPending} type="submit">
        Enviar link de recuperação
      </Button>
    </form>
  );
}
