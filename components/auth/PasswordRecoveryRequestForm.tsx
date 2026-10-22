"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  type PasswordRecoveryRequestState,
  requestPasswordRecovery,
} from "@/app/recuperar-senha/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { validateInvitationEmail } from "@/lib/onboarding/validation";

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

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const inFlightRef = useRef(false);
  const emailValid = validateInvitationEmail(email).ok;

  useEffect(() => {
    if (!isPending) inFlightRef.current = false;
  }, [isPending, state]);

  if (state.success) {
    return (
      <div className={styles.successState}>
        <Alert live="polite" title="Solicitação recebida" variant="success">
          {state.message ??
            "Se este email estiver cadastrado, você receberá um link para redefinir sua senha."}
        </Alert>
        <p className={styles.successHelp}>
          Abra somente o link do email mais recente, no mesmo navegador,
          perfil e dispositivo em que fez o pedido. O link é individual e de
          uso único: não o compartilhe.
        </p>
        <a className={styles.retryLink} href="/recuperar-senha">
          Solicitar outro link
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} aria-busy={isPending} className={styles.form} onSubmit={(event) => {
      setEmailTouched(true);
      if (inFlightRef.current || isPending || !emailValid) {
        event.preventDefault();
        return;
      }
      inFlightRef.current = true;
    }}>
      {state.message ? (
        <Alert
          live="assertive"
          title="Não foi possível continuar"
          variant="critical"
        >
          {state.message}
        </Alert>
      ) : null}
      <FormField
        id="recovery-email"
        label="Email"
        required
        error={emailTouched && !emailValid ? "Informe um email de acesso válido." : undefined}
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            name="email"
            onBlur={() => setEmailTouched(true)}
            onChange={(event) => setEmail(event.target.value)}
            value={email}
            disabled={isPending}
            required
            type="email"
          />
        )}
      </FormField>
      {isPending ? <p role="status">Registrando a solicitação. Não envie novamente.</p> : null}
      <Button disabled={isPending} loading={isPending} type="submit">
        Enviar link de recuperação
      </Button>
    </form>
  );
}
