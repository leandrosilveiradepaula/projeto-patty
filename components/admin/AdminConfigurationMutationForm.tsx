"use client";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "@/app/admin/configuracoes/page.module.css";

export function AdminConfigurationMutationForm({children,submitLabel,run}:{children:ReactNode;submitLabel:string;run:(data:FormData)=>Promise<void>}){
 const router=useRouter();
 const inFlight=useRef(false);
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<"success"|"error"|null>(null);
 const [message,setMessage]=useState("");
 const saved=result==="success";
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(inFlight.current||saved)return;
  inFlight.current=true;setBusy(true);setResult(null);
  try{
   await run(new FormData(event.currentTarget));
   setResult("success");setMessage("Nova versão criada. Atualize a página para editar os novos valores.");router.refresh();
  }catch(error){
   setResult("error");
   setMessage(error instanceof Error && /alterada desde que esta tela|versão ativa|conflito/i.test(error.message)
    ?"A versão foi alterada em outra sessão. Recarregue os dados antes de tentar novamente."
    :"Não foi possível confirmar a gravação. Confira o histórico antes de repetir.");
  }finally{inFlight.current=false;setBusy(false);}
 }
 return <form className={styles.editor} aria-busy={busy} onSubmit={submit} onChange={()=>{if(result==="error")setResult(null);}}>
  {result?<Alert live={saved?"polite":"assertive"} title={saved?"Versão registrada":"Gravação não confirmada"} variant={saved?"success":"critical"}>{message}</Alert>:null}
  <fieldset className={styles.editorFieldset} disabled={busy||saved}>
   {children}
   <Button disabled={busy||saved} loading={busy} type="submit">{submitLabel}</Button>
  </fieldset>
  {result==="error"?<Button type="button" variant="secondary" onClick={()=>router.refresh()}>Recarregar configurações</Button>:null}
 </form>;
}
