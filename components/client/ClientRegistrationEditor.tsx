"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import {
  CLIENT_REGISTRATION_FIELDS, clientRegistrationDraftFromInput, countClientRegistrationChanges,
  equalClientRegistration, getClientRegistrationFieldError, normalizeClientRegistrationDraft,
  type ClientRegistrationDraft, type ClientRegistrationEditorState, type ClientRegistrationInput,
} from "@/lib/clients/registration";
import styles from "./ClientRegistrationEditor.module.css";

type Props = {
  initialValues: ClientRegistrationInput;
  updatedAt: string | null;
  action: (state: ClientRegistrationEditorState, form: FormData) => Promise<ClientRegistrationEditorState>;
  notice: string;
  admin?: boolean;
};

export function ClientRegistrationEditor({initialValues,updatedAt,action,notice,admin=false}:Props) {
  const [state, formAction, pending] = useActionState(action,{message:null,success:false});
  const [draft,setDraft] = useState<ClientRegistrationDraft>(()=>clientRegistrationDraftFromInput(initialValues));
  const [baseline,setBaseline] = useState(initialValues);
  const [baselineVersion,setBaselineVersion] = useState(updatedAt);
  const [touched,setTouched] = useState(false);
  const [showComparison,setShowComparison] = useState(false);
  const [reviewedConflict,setReviewedConflict] = useState(false);
  const [resultVersion,setResultVersion] = useState("");
  const inFlight=useRef(false);
  const router=useRouter();
  const normalized=normalizeClientRegistrationDraft(draft);
  const changed=countClientRegistrationChanges(baseline,normalized);
  const errors=CLIENT_REGISTRATION_FIELDS.map(f=>({key:f.key,message:getClientRegistrationFieldError(f.key,draft[f.key])})).filter(f=>Boolean(f.message));
  const conflict=state.outcome==="conflict" && !reviewedConflict;
  const isDirty=changed>0;
  useEffect(()=>{
    inFlight.current=false;
    if(state.success){
      setBaseline(normalized);
      if(state.updatedAt!==undefined)setBaselineVersion(state.updatedAt);
      setTouched(false);
      setShowComparison(false);
      setReviewedConflict(false);
      router.refresh();
    }
  // A new server result is the commit acknowledgement; unrelated typing is not.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[state,router]);
  useEffect(()=>{
    if(!state.message)return;
    setResultVersion(state.message);
  },[state]);
  function update(key:keyof ClientRegistrationDraft,value:string){
    setDraft(old=>({...old,[key]:value}));
    setTouched(true);
    setReviewedConflict(false);
  }
  function reset(){
    setDraft(clientRegistrationDraftFromInput(baseline));
    setTouched(false);
    setShowComparison(false);
  }
  function reviewServer(){
    if(!state.current)return;
    setBaseline(state.current.values);
    setBaselineVersion(state.current.updatedAt);
    setReviewedConflict(true);
    setShowComparison(true);
  }
  const saveBlocked=pending||Boolean(errors.length)||!isDirty||conflict;
  return <form action={formAction} aria-busy={pending} className={styles.form} onSubmit={event=>{
    if(inFlight.current||saveBlocked){event.preventDefault();return;}
    inFlight.current=true;
  }}>
    <input type="hidden" name="expectedUpdatedAt" value={baselineVersion??""}/>
    {state.message ? <Alert live={state.success?"polite":"assertive"} title={state.success?"Cadastro conferido":conflict?"Alteração simultânea":"Não foi possível salvar"} variant={state.success?"success":"critical"}>{state.message}</Alert>:null}
    {pending?<p role="status">Conferindo a versão e salvando o Cadastro Atual…</p>:null}
    <p className={styles.meta}>Todos os dados de contato são opcionais. Campos em branco são apagados somente após salvar.</p>
    <div className={styles.grid}>{CLIENT_REGISTRATION_FIELDS.map(field=>
      <FormField key={field.key} id={(admin?"admin-":"")+"registration-"+field.key} label={field.label}
        description={field.key==="contactEmail"?"Contato operacional, independente do email de login.":field.key==="instagram"?"Dado informativo, não enviado à IA por padrão.":undefined}
        error={errors.find(e=>e.key===field.key)?.message}>
        {props=><TextInput {...props} autoComplete={field.autoComplete} name={field.key} maxLength={field.maxLength}
          type={field.key==="contactEmail"?"email":"text"} inputMode={field.key==="phone"?"tel":field.key==="contactEmail"?"email":undefined}
          disabled={pending||conflict} value={draft[field.key]} onChange={event=>update(field.key,event.target.value)}/>}
      </FormField>)}</div>
    <p className={styles.meta} aria-live="polite">{changed===0?"Nenhuma mudança em relação aos dados salvos.":changed===1?"1 campo alterado ainda não salvo.":changed+" campos alterados ainda não salvos."}</p>
    {touched&&isDirty?<p className={styles.meta}>Suas alterações não serão enviadas automaticamente. Salve antes de sair.</p>:null}
    {errors.length>0?<p className={styles.error} role="alert">Revise {errors.length} campo(s) antes de salvar.</p>:null}
    {conflict&&state.current?<div className={styles.conflict}>
      <p>Existe uma versão mais recente no servidor. Seu preenchimento permanece nesta tela.</p>
      <dl>{CLIENT_REGISTRATION_FIELDS.map(field=><div key={field.key}><dt>{field.label}</dt><dd>Salvo: {state.current?.values[field.key]||"Não informado"}</dd><dd>Seu rascunho: {draft[field.key]||"Não informado"}</dd></div>)}</dl>
      <Button type="button" variant="secondary" onClick={reviewServer}>Conferi os valores atuais; manter meu rascunho</Button>
      <Button type="button" variant="secondary" onClick={()=>{setDraft(clientRegistrationDraftFromInput(state.current!.values));setBaseline(state.current!.values);setBaselineVersion(state.current!.updatedAt);setReviewedConflict(true);setTouched(false);}}>Descartar meu rascunho e usar dados atuais</Button>
    </div>:null}
    {showComparison&&!conflict?<div className={styles.review}>
      <strong>Revise as alterações antes de salvar:</strong>
      <dl>{CLIENT_REGISTRATION_FIELDS.filter(f=>baseline[f.key]!==normalized[f.key]).map(field=><div key={field.key}>
        <dt>{field.label}</dt><dd>Atual: {baseline[field.key]||"Não informado"}</dd><dd>Novo: {normalized[field.key]||"Não informado"}</dd>
      </div>)}</dl>
    </div>:null}
    <p className={styles.meta}>{notice}</p>
    <div className={styles.actions}>
      <Button disabled={saveBlocked} loading={pending} type="submit">Salvar Cadastro Atual</Button>
      <Button disabled={pending||!isDirty} type="button" variant="secondary" onClick={reset}>Descartar alterações locais</Button>
      <Button disabled={!isDirty||pending||conflict} type="button" variant="secondary" onClick={()=>setShowComparison(x=>!x)}>{showComparison?"Ocultar comparação":"Conferir mudanças"}</Button>
    </div>
  </form>;
}
