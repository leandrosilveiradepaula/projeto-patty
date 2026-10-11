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
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [attempted,setAttempted]=useState(false);
  const inFlight=useRef(false);
  const emailValid=validateInvitationEmail(email).ok;
  const passwordValid=password.length>0&&password.length<=128;
  useEffect(()=>{inFlight.current=false},[state]);
  return (
    <form action={formAction} aria-busy={isPending} className={styles.form} onSubmit={event=>{setAttempted(true);if(inFlight.current||isPending||!emailValid||!passwordValid){event.preventDefault();return;}inFlight.current=true;}}>
      {state.message ? <Alert live="assertive" title="Não foi possível entrar" variant="critical">{state.message}</Alert> : null}
      <FormField id="email" label="Email" required>
        {(fieldProps) => <TextInput {...fieldProps} autoComplete="email" disabled={isPending} inputMode="email" maxLength={254} name="email" required type="email" value={email} onChange={event=>setEmail(event.target.value)} />}
      </FormField>
      <FormField id="password" label="Senha" required>
        {(fieldProps) => <TextInput {...fieldProps} autoComplete="current-password" disabled={isPending} maxLength={128} name="password" required type={showPassword?"text":"password"} value={password} onChange={event=>setPassword(event.target.value)} />}
      </FormField>
      <Button variant="ghost" type="button" disabled={isPending} onClick={()=>setShowPassword(v=>!v)} aria-pressed={showPassword}>{showPassword?"Ocultar senha":"Mostrar senha"}</Button>
      {attempted && !emailValid?<p role="alert">Confira o email de acesso informado.</p>:null}
      {attempted && !passwordValid?<p role="alert">Informe uma senha válida.</p>:null}
      {isPending ? <p role="status">Aguarde a confirmação antes de tentar novamente.</p> : null}
      <Button disabled={isPending||!emailValid||!passwordValid} loading={isPending} type="submit">Entrar</Button>
      <Link className={styles.recoveryLink} href="/recuperar-senha">
        Esqueci minha senha
      </Link>
    </form>
  );
}
