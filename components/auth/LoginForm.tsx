"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type LoginState, login } from "@/app/login/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./LoginForm.module.css";

const initialLoginState: LoginState = { message: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialLoginState);
  return (
    <form action={formAction} aria-busy={isPending} className={styles.form}>
      {state.message ? <Alert live="assertive" title="Não foi possível entrar" variant="critical">{state.message}</Alert> : null}
      <FormField id="email" label="Email" required>
        {(fieldProps) => <TextInput {...fieldProps} autoComplete="email" disabled={isPending} inputMode="email" maxLength={254} name="email" required type="email" />}
      </FormField>
      <FormField id="password" label="Senha" required>
        {(fieldProps) => <TextInput {...fieldProps} autoComplete="current-password" disabled={isPending} maxLength={128} name="password" required type="password" />}
      </FormField>
      {isPending ? <p role="status">Aguarde a confirmação antes de tentar novamente.</p> : null}
      <Button loading={isPending} type="submit">Entrar</Button>
      <Link className={styles.recoveryLink} href="/recuperar-senha">
        Esqueci minha senha
      </Link>
    </form>
  );
}
