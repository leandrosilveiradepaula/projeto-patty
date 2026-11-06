"use client";
import { useState } from "react";
import { parseAssessmentFamilyMapping, type AssessmentFamilyMapping } from "@/lib/imports/historical-assessment-family-mapping";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Source=Readonly<{
  source_id:string;source_sha256:string;layout_signature_sha256:string;
  client_id:string;existing_assessment_receipts:number;
}>;
type Entry=Readonly<{
  id:string;date:string;identity:boolean;mapping:boolean;custody:boolean;
  proposal:string|null;result:"pending"|"reviewed"|"saved"|"blocked";receipt?:string;
}>;
type Selection=Readonly<{file:File|null;entries:readonly Entry[]}>;
const MAX_PER_RUN=5,MAX_BYTES=20*1024*1024,MAX_DATES=4;
const SHA=/^[a-f0-9]{64}$/;
const SOURCE=/^source_[0-9]{4}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const emptyEntry=():Entry=>({id:crypto.randomUUID(),date:"",identity:false,mapping:false,
  custody:false,proposal:null,result:"pending"});
const empty=():Selection=>({file:null,entries:[]});
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");
function validDate(value:string) {
  if(!DATE.test(value)||value.startsWith("0000-"))return false;
  const date=new Date(value+"T12:00:00.000Z");
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function HistoricalAssessmentFamilyBatchStageForm({batchId,sources}:{
  batchId:string;sources:readonly Source[];
}){
  const [mapFile,setMapFile]=useState<File|null>(null);
  const [family,setFamily]=useState<AssessmentFamilyMapping|null>(null);
  const [decisions,setDecisions]=useState<Record<string,Selection>>({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const compatible=family?sources.filter(s=>
    s.layout_signature_sha256===family.column_signature_sha256
    && SHA.test(s.source_sha256)&&SOURCE.test(s.source_id)):[];
  const ready=compatible.flatMap(s=>(decisions[s.source_id]?.entries??[])
    .filter(e=>e.result==="reviewed" && !!e.proposal && e.identity && e.mapping && e.custody
      && validDate(e.date) && !!decisions[s.source_id]?.file)
    .map(e=>({source:s,entry:e})));
  function resetMap(file:File|null) {
    setMapFile(file);setFamily(null);setDecisions({});setMessage("");
  }
  async function loadMap(){
    if(busy||!mapFile||mapFile.size<1||mapFile.size>16*1024||!/\.json$/i.test(mapFile.name))return;
    try {
      const parsed=parseAssessmentFamilyMapping(JSON.parse(await mapFile.text()) as unknown);
      setFamily(parsed);setDecisions({});setMessage("");
    }catch {
      setFamily(null);setDecisions({});
      setMessage("Mapa inválido: confira assinatura, coordenadas, medidas e unidades originais.");
    }
  }
  function setFile(id:string,file:File|null){
    setDecisions(prev=>({...prev,[id]:{file,entries:file?[emptyEntry()]:[]}}));
    setMessage("");
  }
  function patch(id:string,entryId:string,change:Partial<Entry>) {
    setDecisions(prev=>{
      const current=prev[id]??empty();
      return {...prev,[id]:{...current,entries:current.entries.map(e=>
        e.id===entryId?{...e,...change,proposal:null,result:"pending",receipt:undefined}:e)}};
    });
  }
  function mark(id:string,entryId:string,result:Entry["result"],proposal:string|null,receipt?:string){
    setDecisions(prev=>{
      const current=prev[id]??empty();
      return {...prev,[id]:{...current,entries:current.entries.map(e=>
        e.id===entryId?{...e,proposal,result,receipt}:e)}};
    });
  }
  function addDate(id:string){
    setDecisions(prev=>{
      const current=prev[id]??empty();
      if(!current.file||current.entries.length>=MAX_DATES)return prev;
      return {...prev,[id]:{...current,entries:[...current.entries,emptyEntry()]}};
    });
  }
  async function checkFile(source:Source,file:File){
    if(file.size<1||file.size>MAX_BYTES||file.name.length>255||!/\.xlsx$/i.test(file.name))
      throw Error("invalid_xlsx");
    const hash=hex(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()));
    if(hash!==source.source_sha256)throw Error("source_mismatch");
  }
  async function send(source:Source,entry:Entry,operation:"review_measurements"|"stage_measurements"){
    const file=decisions[source.source_id]?.file;
    if(!family||!file||!validDate(entry.date))throw Error("not_ready");
    await checkFile(source,file);
    const body=new FormData();
    body.set("operation",operation);
    body.set("excel",file);
    body.set("sha256",source.source_sha256);
    body.set("column_signature_sha256",family.column_signature_sha256);
    body.set("assessed_on",entry.date);
    body.set("measurements",JSON.stringify(family.measurements));
    body.set("confirmed_identity","true");
    if(operation==="stage_measurements"){
      if(!entry.proposal)throw Error("missing_preview");
      body.set("proposal_sha256",entry.proposal);
      body.set("batch_id",batchId);
      body.set("source_id",source.source_id);
      body.set("confirmed_mapping","true");
      body.set("confirmed_custody","true");
    }
    const res=await fetch(`/api/admin/clients/${source.client_id}/historical-excel`,{
      method:"POST",credentials:"same-origin",cache:"no-store",body});
    const value:unknown=await res.json();
    if(!res.ok||!value||typeof value!=="object")throw Error("request_blocked");
    return value as Record<string,unknown>;
  }
  function canReview(source:Source,entry:Entry){
    const d=decisions[source.source_id];
    return !!d?.file&&entry.identity&&entry.mapping&&entry.custody&&validDate(entry.date)
      && d.entries.every(x=>x.id===entry.id||x.date!==entry.date)
      && entry.result!=="saved";
  }
  async function reviewOne(source:Source,entry:Entry) {
    if(busy||!family||!canReview(source,entry))return;
    setBusy(true);setMessage("");
    try {
      const p=await send(source,entry,"review_measurements");
      if(p.state!=="pending_professional_review"||p.persistence!=="none"
        ||p.approval!=="human_required"
        ||p.proposed_measurement_count!==family.measurements.length
        ||typeof p.proposal_sha256!=="string"||!SHA.test(p.proposal_sha256))
        throw Error("invalid_preview");
      mark(source.source_id,entry.id,"reviewed",p.proposal_sha256 as string);
    }catch{
      mark(source.source_id,entry.id,"blocked",null);
      setMessage("Prévia bloqueada. Confira o Excel, a data e o significado das medidas. Nada foi confirmado como guardado.");
    }finally{setBusy(false);}
  }
  async function stageSelected(){
    if(busy||!family||ready.length<1||ready.length>MAX_PER_RUN)return;
    setBusy(true);setMessage("");
    for(const {source,entry} of ready){
      try{
        const p=await send(source,entry,"stage_measurements");
        if(p.state!=="staged_private"||p.source_id!==source.source_id
          ||p.measurement_count!==family.measurements.length||typeof p.import_id!=="string")
          throw Error("invalid_receipt");
        mark(source.source_id,entry.id,"saved",null,p.import_id as string);
      }catch{
        mark(source.source_id,entry.id,"blocked",null);
      }
    }
    setBusy(false);
    setMessage("Rodada encerrada. Confira recibos por origem e data. Fontes bloqueadas exigem nova conferência.");
  }
  return <div style={{display:"grid",gap:"1rem"}} aria-busy={busy}>
    <p>Um mapa técnico pode ser reutilizado em Excel de estrutura idêntica. Informe
      separadamente as datas reais de cada avaliação e confirme identidade, significado
      da medida/unidade e custódia de cada origem. Não há conversão automática ou publicação.</p>
    <label>Mapa técnico de avaliações (.json, sem respostas ou datas)
      <input type="file" accept=".json,application/json" disabled={busy}
        onChange={e=>resetMap(e.target.files?.[0]??null)}/>
    </label>
    <Button type="button" variant="secondary" disabled={!mapFile||busy}
      onClick={()=>void loadMap()}>Conferir mapa da família</Button>
    {family?<div style={{display:"grid",gap:"0.75rem"}}>
      <Alert variant="info">
        Mapa válido: {family.measurements.length} medida(s), {compatible.length} origem(ns)
        compatível(eis) pela assinatura. Datas e identidades não são inferidas.
      </Alert>
      {compatible.length===0?<p>Não há origens elegíveis nesta família.</p>:null}
      {compatible.map(source=>{
        const selection=decisions[source.source_id]??empty();
        return <div key={source.source_id}
          style={{border:"1px solid var(--border, #8884)",borderRadius:"0.75rem",
            padding:"1rem",display:"grid",gap:"0.75rem"}}>
          <strong>Origem {source.source_id} — SHA {source.source_sha256.slice(0,12)}…</strong>
          <p>Cliente proposta: <code>{source.client_id}</code>. Recibos já registrados
            nesta origem: {source.existing_assessment_receipts}. O mapa não comprova identidade.</p>
          <label>Excel desta origem (.xlsx)
            <input type="file" accept=".xlsx" disabled={busy}
              onChange={e=>setFile(source.source_id,e.target.files?.[0]??null)}/>
          </label>
          {selection.entries.map(entry=><div key={entry.id}
            style={{border:"1px solid var(--border, #8884)",borderRadius:"0.5rem",
              padding:"0.75rem",display:"grid",gap:"0.5rem"}}>
            <label>Data real desta avaliação
              <input type="date" value={entry.date} disabled={busy||entry.result==="saved"}
                onChange={e=>patch(source.source_id,entry.id,{date:e.target.value,
                  identity:false,mapping:false,custody:false})}/>
            </label>
            <label><input type="checkbox" checked={entry.identity} disabled={busy||entry.result==="saved"}
              onChange={e=>patch(source.source_id,entry.id,{identity:e.target.checked})}/>
              Confirmei pessoalmente a identidade desta origem e desta avaliação.
            </label>
            <label><input type="checkbox" checked={entry.mapping} disabled={busy||entry.result==="saved"}
              onChange={e=>patch(source.source_id,entry.id,{mapping:e.target.checked})}/>
              Conferi data, significado das medidas e unidades originais desta avaliação.
            </label>
            <label><input type="checkbox" checked={entry.custody} disabled={busy||entry.result==="saved"}
              onChange={e=>patch(source.source_id,entry.id,{custody:e.target.checked})}/>
              Confirmei proveniência e autorização para guarda privada do original.
            </label>
            {entry.result==="saved"?<Alert variant="info">
              Recibo de guarda privada em {entry.date}: <code>{entry.receipt}</code>.
              Nenhuma avaliação atual foi criada.
            </Alert>:<>
              {entry.result==="blocked"?<Alert variant="warning">
                Esta avaliação está bloqueada; revise e tente nova prévia.
              </Alert>:null}
              {entry.result==="reviewed"?<Alert variant="info">
                Prévia confirmada no servidor, sem persistência: <code>{entry.proposal?.slice(0,16)}…</code>.
              </Alert>:null}
              <Button type="button" variant="secondary" disabled={busy||!canReview(source,entry)
                ||entry.result==="reviewed"} onClick={()=>void reviewOne(source,entry)}>
                Conferir esta avaliação, sem guardar
              </Button>
            </>}
          </div>)}
          {selection.file?<Button type="button" variant="secondary"
            disabled={busy||selection.entries.length>=MAX_DATES}
            onClick={()=>addDate(source.source_id)}>
            Adicionar outra data para este Excel (máximo {MAX_DATES} por rodada)
          </Button>:null}
        </div>;
      })}
      <Button type="button" loading={busy}
        disabled={busy||ready.length<1||ready.length>MAX_PER_RUN}
        onClick={()=>void stageSelected()}>
        Guardar {ready.length} avaliação(ões) revisada(s), máximo {MAX_PER_RUN} por rodada
      </Button>
    </div>:null}
    {message?<Alert variant="info" live="polite">{message}</Alert>:null}
  </div>;
}
