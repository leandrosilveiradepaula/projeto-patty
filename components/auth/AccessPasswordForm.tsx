"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { accessPasswordIssues } from "@/lib/onboarding/validation";
import styles from "./AccessPasswordForm.module.css";

type PasswordAction=(state:{message:string|null},formData:FormData)=>Promise<{message:string|null}>;
export function AccessPasswordForm({action,mode,role}:{action:PasswordAction;mode:"activate"|"reset";role?:"admin"|"client"|null}) {
 const [state,formAction,pending]=useActionState(action,{message:null});
 const [password,setPassword]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [showConfirmation,setShowConfirmation]=useState(false);
 const [touched,setTouched]=useState(false);
 const [interactive,setInteractive]=useState(false);
 const inFlight=useRef(false);
 const issues=accessPasswordIssues(password,confirmation);
 const canSubmit=!issues.password&&!issues.passwordConfirmation;
 useEffect(()=>{inFlight.current=false},[state]);
 useEffect(()=>{setInteractive(true)},[]);
 return <form action={formAction} className={styles.form} data-interactive={interactive?"true":"false"} aria-busy={pending||!interactive} onSubmit={event=>{
   setTouched(true);
   if(inFlight.current||pending||!interactive||!canSubmit){event.preventDefault();return}
   inFlight.current=true;
 }}>
  {state.message?<Alert live="assertive" title={mode==="activate"?"Não foi possível criar a senha":"Não foi possível redefinir"} variant="critical">{state.message}</Alert>:null}
  <FormField id={mode+"-password"} label={mode==="activate"?"Crie sua senha":"Nova senha"} required
    description={mode==="activate"?(role==="admin"?"Use pelo menos 8 caracteres. Depois, você configurará a autenticação em duas etapas obrigatória para a área administrativa.":"Use pelo menos 8 caracteres. Depois, você entrará normalmente com seu email e essa senha."):"Use entre 8 e 128 caracteres."}
    error={touched?issues.password:undefined}>
   {props=><TextInput {...props} name="password" type={showPassword?"text":"password"} autoComplete="new-password" required minLength={8} maxLength={128} disabled={pending||!interactive} value={password} onChange={e=>setPassword(e.target.value)}/>}
  </FormField>
  <button className={styles.toggle} type="button" disabled={pending||!interactive} onClick={()=>setShowPassword(s=>!s)} aria-pressed={showPassword}>{showPassword?"Ocultar senha":"Mostrar senha"}</button>
  <FormField id={mode+"-password-confirmation"} label={mode==="activate"?"Confirme sua senha":"Confirmar nova senha"} required error={touched?issues.passwordConfirmation:undefined}>
   {props=><TextInput {...props} name="passwordConfirmation" type={showConfirmation?"text":"password"} autoComplete="new-password" required minLength={8} maxLength={128} disabled={pending||!interactive} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/>}
  </FormField>
  <button className={styles.toggle} type="button" disabled={pending||!interactive} onClick={()=>setShowConfirmation(s=>!s)} aria-pressed={showConfirmation}>{showConfirmation?"Ocultar confirmação":"Mostrar confirmação"}</button>
  {!interactive?<p role="status" className={styles.hint}>Preparando formulário para digitação…</p>:null}
  <p role="status" className={styles.hint}>{password.length===0?"Informe uma senha nova.":password.length<8?"Faltam "+(8-password.length)+" caracteres para o mínimo.":password.length>128?"A senha ultrapassa o limite de 128 caracteres.":"Mínimo de 8 caracteres atendido."}</p>
  <p className={styles.hint}>Dica de segurança: prefira uma senha longa e exclusiva, que você não utilize em outros serviços. O comprimento mínimo não garante que uma senha seja segura.</p>
  {touched&&!canSubmit?<p role="alert" className={styles.hint}>Revise os campos destacados antes de continuar.</p>:null}
  {pending?<p role="status">Confirmando alteração da senha. Não envie novamente.</p>:null}
  <Button type="submit" loading={pending} disabled={pending||!interactive||!canSubmit}>{mode==="activate"?"Criar senha e continuar":"Salvar nova senha"}</Button>
  {mode==="reset"?<Link href="/recuperar-senha">Link expirou? Solicitar outra recuperação</Link>:<Link href="/login">Voltar ao login</Link>}
 </form>
}
