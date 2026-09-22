"use client";

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
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? <Alert live="assertive" title="Não foi possível entrar" variant="critical">{state.message}</Alert> : null}
      <FormField id="email" label="Email" required>
        {(fieldProps) => <TextInput {...fieldProps} autoComplete="email" inputMode="email" name="email" required type="email" />}
      </FormField>
      <FormField id="password" label="Senha" required>
        {(fieldProps) => <TextInput {...fieldProps} autoComplete="current-password" name="password" required type="password" />}
      </FormField>
      <Button loading={isPending} type="submit">Entrar</Button>
    </form>
  );
}
