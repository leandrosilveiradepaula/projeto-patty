"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { type LoginState, login } from "@/app/login/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { validateInvitationEmail } from "@/lib/onboarding/validation";
import styles from "./LoginForm.module.css";

const initialLoginState: LoginState = { message: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialLoginState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const inFlightRef = useRef(false);
  const emailValid = validateInvitationEmail(email).ok;
  const passwordValid = password.length > 0 && password.length <= 128;

  useEffect(() => {
    if (!isPending) inFlightRef.current = false;
  }, [isPending, state]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        setEmailTouched(true);
        setPasswordTouched(true);
        if (inFlightRef.current || isPending || !emailValid || !passwordValid) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
    >
      {state.message ? (
        <Alert live="assertive" title="Não foi possível entrar" variant="critical">
          {state.message}
        </Alert>
      ) : null}
      <FormField
        id="email"
        label="Email"
        required
        error={emailTouched && !emailValid ? "Informe um email de acesso válido." : undefined}
      >
        {(props) => (
          <TextInput
            {...props}
            autoComplete="email"
            disabled={isPending}
            inputMode="email"
            maxLength={254}
            name="email"
            onBlur={() => setEmailTouched(true)}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        )}
      </FormField>
      <FormField
        id="password"
        label="Senha"
        required
        error={passwordTouched && !passwordValid ? "Informe uma senha para continuar." : undefined}
      >
        {(props) => (
          <TextInput
            {...props}
            autoComplete="current-password"
            disabled={isPending}
            maxLength={128}
            name="password"
            onBlur={() => setPasswordTouched(true)}
            onChange={(event) => setPassword(event.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
        )}
      </FormField>
      <button
        aria-pressed={showPassword}
        className={styles.toggle}
        disabled={isPending}
        onClick={() => setShowPassword((current) => !current)}
        type="button"
      >
        {showPassword ? "Ocultar senha" : "Mostrar senha"}
      </button>
      {isPending ? (
        <p role="status">Confirmando acesso. Não envie novamente.</p>
      ) : null}
      <Button disabled={isPending} loading={isPending} type="submit">
        Entrar
      </Button>
      <Link className={styles.recoveryLink} href="/recuperar-senha">
        Esqueci minha senha
      </Link>
    </form>
  );
}
