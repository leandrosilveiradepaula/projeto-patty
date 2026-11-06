"use client";

import Link from "next/link";
import {useState} from "react";
import type {HistoricalPilotFingerprint} from "@/lib/imports/historical-pilot-local-digest";
import {makeVerifiedHistoricalPilotPlan,type VerifiedPilotSource} from "@/lib/imports/historical-pilot-verified-plan";
import {Alert} from "@/components/ui/Alert";
import styles from "./HistoricalPilotVerifiedRegistration.module.css";

export type PilotClientChoice=Readonly<{id:string;label:string}>;
type RegistrationReceipt=Readonly<{batch_id:string;status:"pending_review";source_count:number}>;

const HASH=/^[0-9a-f]{64}$/;
const ID=/^source_[0-9]{4}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex=(buffer:ArrayBuffer)=>Array.from(new Uint8Array(buffer),
  n=>n.toString(16).padStart(2,"0")).join("");

/** Upload is VOLUNTARY, transient, one source at a time, never silent. */
export function HistoricalPilotVerifiedRegistration({
  files,fingerprint,clientChoices,
}:Readonly<{
  files:readonly File[];
  fingerprint:HistoricalPilotFingerprint;
  clientChoices:readonly PilotClientChoice[];
}>) {
  const [clientId,setClientId]=useState("");
  const [identity,setIdentity]=useState(false);
  const [custody,setCustody]=useState(false);
  const [permitInspect,setPermitInspect]=useState(false);
  const [permitRegister,setPermitRegister]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [verified,setVerified]=useState<readonly VerifiedPilotSource[]|null>(null);
  const [batchId,setBatchId]=useState("");
  const [receipt,setReceipt]=useState<RegistrationReceipt|null>(null);
  const validatedClient=clientChoices.some(c=>c.id===clientId);
  const eligible=fingerprint.source_count===files.length
    &&files.length>0&&files.length<=32
    &&fingerprint.principal_excel_count===1
    &&fingerprint.duplicate_binary_count===0
    &&validatedClient&&identity&&custody&&permitInspect;
  function reset(){
    setVerified(null);setBatchId("");setReceipt(null);setPermitRegister(false);setError("");
  }

  async function inspect(){
    if(busy||!eligible)return;
    setBusy(true);reset();
    const matched=new Set<string>();
    const inspected:VerifiedPilotSource[]=[];
    try{
      for(const file of files){
        const name=file.webkitRelativePath.split("/").at(-1)??"";
        const isExcel=/\.xlsx$/i.test(name);
        const isPhoto=/\.(jpe?g|png)$/i.test(name);
        if(!isExcel&&!isPhoto)throw Error("invalid_source_type");
        const kind=isExcel?"xlsx" as const:"photo" as const;
        // Match original content to the exact SHA identified locally.
        const localHash=hex(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()));
        const matching=fingerprint.sources.find(source=>
          source.sha256===localHash && source.kind===kind
          && !matched.has(source.source_id));
        if(!matching)throw Error("source_changed");
        const form=new FormData();
        form.set("kind",kind);
        // Explicitly replace source names in the multipart part header.
        form.set("file",file,kind==="xlsx"?"source.xlsx":"source.jpg");
        const response=await fetch("/api/admin/imports/initial-load/inspect",{
          method:"POST",credentials:"same-origin",body:form,cache:"no-store",
        });
        if(!response.ok)throw Error("source_not_recognized");
        const raw:unknown=await response.json();
        if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("invalid_result");
        const value=raw as Record<string,unknown>;
        if(value.kind!==kind||value.sha256!==localHash
          ||!HASH.test(localHash)||!ID.test(matching.source_id)
          ||Object.keys(value).some(key=>![
            "sha256","kind","layout_signature_sha256","worksheet_count","photo_type",
          ].includes(key)))throw Error("source_mismatch");
        if(kind==="xlsx"&&(
          typeof value.layout_signature_sha256!=="string"
          ||!HASH.test(value.layout_signature_sha256)
          ||!Number.isSafeInteger(value.worksheet_count)
          ||Number(value.worksheet_count)<1||Number(value.worksheet_count)>64
          ||value.photo_type!==undefined))throw Error("invalid_xlsx");
        if(kind==="photo"&&(!["png","jpeg"].includes(String(value.photo_type))
          ||value.worksheet_count!==undefined||value.layout_signature_sha256!==undefined))
          throw Error("invalid_photo");
        matched.add(matching.source_id);
        inspected.push({
          source_id:matching.source_id,kind,sha256:localHash,
          ...(kind==="xlsx"?{
            layout_signature_sha256:value.layout_signature_sha256 as string,
            worksheet_count:value.worksheet_count as number,
          }:{photo_type:value.photo_type as "jpeg"|"png"}),
        });
      }
      if(matched.size!==fingerprint.source_count)throw Error("missing_sources");
      // A pure validator checks the existing contract and all 16 metadata entries
      // before enabling the ledger registration button.
      makeVerifiedHistoricalPilotPlan(fingerprint,inspected,clientId);
      setVerified(inspected);
      setBatchId(crypto.randomUUID());
    }catch{
      setVerified(null);
      setError("A inspeção foi interrompida. Nenhum lote foi registrado nem arquivos guardados. Confira as fontes e a associação da cliente.");
    }finally{setBusy(false);}
  }
  async function register(){
    if(busy||!verified||!validatedClient||!identity||!custody
      ||!permitInspect||!permitRegister||!UUID.test(batchId)||receipt)return;
    setBusy(true);setError("");
    try{
      const plan=makeVerifiedHistoricalPilotPlan(fingerprint,verified,clientId);
      const response=await fetch("/api/admin/imports/initial-load",{
        method:"POST",credentials:"same-origin",
        headers:{"content-type":"application/json"},cache:"no-store",
        body:JSON.stringify({batch_id:batchId,plan}),
      });
      const data:unknown=await response.json();
      if(!response.ok||!data||typeof data!=="object"||Array.isArray(data))
        throw Error("registration_failed");
      const value=data as Record<string,unknown>;
      if(value.batch_id!==batchId||value.status!=="pending_review"
        ||value.source_count!==fingerprint.source_count)throw Error("invalid_receipt");
      setReceipt({
        batch_id:batchId,status:"pending_review",
        source_count:fingerprint.source_count,
      });
    }catch{
      setError("Não foi possível registrar o lote. Nenhum arquivo original foi armazenado. Preserve a seleção e não crie outro lote sem revisar o erro.");
    }finally{setBusy(false);}
  }

  return <section className={styles.panel} aria-label="Preparar registro privado do lote">
    <h3>Próxima etapa: conferir fontes e registrar lote</h3>
    <p>Este passo é diferente da identificação SHA local: com sua autorização,
      os arquivos serão enviados <strong>temporariamente, um de cada vez</strong>,
      para validar os formatos no servidor. Nenhum original será armazenado
      nesta inspeção. O registro posterior contém somente metadados privados,
      não importa respostas ou fotos para a cliente.</p>
    {fingerprint.source_count>32?<Alert variant="warning">
      Esta inspeção guiada aceita até 32 arquivos por piloto. O acervo completo
      usará processamento em lotes, sem reorganização das pastas.
    </Alert>:null}
    <label className={styles.field}>
      <strong>Selecione o cadastro canônico da cliente</strong>
      <select value={clientId} disabled={busy||!!receipt}
        onChange={e=>{setClientId(e.target.value);reset();}}>
        <option value="">Escolha uma cliente já cadastrada</option>
        {clientChoices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </label>
    <p className={styles.hint}>
      Se a cliente não está cadastrada, <Link href="/admin/clientes/historico">cadastre-a
      historicamente</Link> após conferir que ainda não existe. Não é necessário
      criar login ou ativar acompanhamento.
    </p>
    <label className={styles.check}>
      <input type="checkbox" checked={identity} disabled={busy||!!receipt}
        onChange={e=>{setIdentity(e.target.checked);reset();}}/>
      Conferi no cadastro que esta pasta e seus arquivos correspondem à cliente
      selecionada. O nome da pasta, sozinho, não é prova de identidade.
    </label>
    <label className={styles.check}>
      <input type="checkbox" checked={custody} disabled={busy||!!receipt}
        onChange={e=>{setCustody(e.target.checked);reset();}}/>
      Confirmo que o acervo pertence à consultoria e que há autorização
      aplicável para sua leitura e tratamento nesta conferência.
    </label>
    <label className={styles.check}>
      <input type="checkbox" checked={permitInspect} disabled={busy||!!receipt}
        onChange={e=>{setPermitInspect(e.target.checked);reset();}}/>
      Autorizo expressamente o envio temporário dos arquivos desta pasta ao
      servidor autenticado apenas para validar o conteúdo técnico.
    </label>
    <button type="button" className={styles.action}
      disabled={busy||!eligible||!!receipt}
      onClick={()=>void inspect()}>
      {busy?"Processando solicitação...":"Validar formatos dos arquivos"}
    </button>
    {verified?<div className={styles.receipt} role="status">
      <strong>Inspeção técnica concluída</strong>
      <p>{verified.length} fontes conferidas: {verified.filter(x=>x.kind==="xlsx").length}
        {" "}planilhas e {verified.filter(x=>x.kind==="photo").length} fotografias.
        O conteúdo clínico não foi interpretado nem gravado.</p>
      <label className={styles.check}>
        <input type="checkbox" checked={permitRegister} disabled={busy||!!receipt}
          onChange={e=>setPermitRegister(e.target.checked)}/>
        Autorizo registrar apenas o inventário técnico e a associação proposta
        a esta cliente, para revisão posterior. Isso não importa os arquivos.
      </label>
      <button type="button" className={styles.action}
        disabled={busy||!!receipt||!permitRegister}
        onClick={()=>void register()}>
        Registrar lote para revisão
      </button>
    </div>:null}
    {error?<Alert variant="warning" live="assertive">{error}</Alert>:null}
    {receipt?<Alert variant="info" title="Lote registrado — revisão pendente" live="polite">
      {receipt.source_count} fontes registradas. Código: <code>{receipt.batch_id}</code>.
      Nenhuma fotografia ou planilha original foi armazenada.
      <Link href={`/admin/importacao-inicial?batch=${receipt.batch_id}`}>
        Abrir reconciliação e revisão do lote
      </Link>
    </Alert>:null}
  </section>;
}
