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
  const [email,setEmail]=useState("");
  const [attempted,setAttempted]=useState(false);
  const inFlight=useRef(false);
  const emailValid=validateInvitationEmail(email).ok;
  useEffect(()=>{inFlight.current=false},[state]);

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
    <form action={formAction} aria-busy={isPending} className={styles.form} onSubmit={event=>{setAttempted(true);if(inFlight.current||isPending||!emailValid){event.preventDefault();return;}inFlight.current=true;}}>
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
            value={email}
            onChange={event=>setEmail(event.target.value)}
            disabled={isPending}
            required
            type="email"
          />
        )}
      </FormField>
      {attempted && !emailValid?<p role="alert">Confira o email de acesso informado.</p>:null}
      {isPending ? <p role="status">Aguarde a confirmação antes de tentar novamente.</p> : null}
      <Button disabled={isPending||!emailValid} loading={isPending} type="submit">
        Enviar link de recuperação
      </Button>
    </form>
  );
}
